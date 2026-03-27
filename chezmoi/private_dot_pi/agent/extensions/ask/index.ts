import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Editor, type EditorTheme, Key, matchesKey, Text, truncateToWidth } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";

interface AskOption {
  label: string;
  description?: string;
}

interface AskQuestion {
  id: string;
  question: string;
  options: AskOption[];
  multi?: boolean;
  recommended?: number;
}

interface QuestionResult {
  id: string;
  question: string;
  options: string[];
  multi: boolean;
  selectedOptions: string[];
  customInput?: string;
}

interface AskDetails {
  question?: string;
  options?: string[];
  multi?: boolean;
  selectedOptions?: string[];
  customInput?: string;
  results?: QuestionResult[];
  cancelled?: boolean;
}

interface AskDialogResult {
  cancelled: boolean;
  results: QuestionResult[];
}

interface QuestionState {
  selectedOptions: string[];
  customInput?: string;
  cursorIndex: number;
}

type Entry =
  | { kind: "option"; option: AskOption; optionIndex: number }
  | { kind: "done" }
  | { kind: "other" };

const OTHER_OPTION_LABEL = "Other (type your own)";
const DONE_MULTI_LABEL = "Done selecting";
const RECOMMENDED_SUFFIX = " (Recommended)";

const AskOptionSchema = Type.Object({
  label: Type.String({ description: "Display label for the option" }),
  description: Type.Optional(Type.String({ description: "Optional helper text shown below the option" })),
});

const AskQuestionSchema = Type.Object({
  id: Type.String({ description: "Stable question identifier, e.g. 'auth' or 'deployment'" }),
  question: Type.String({ description: "The question to ask the user" }),
  options: Type.Array(AskOptionSchema, {
    description: "2-5 concise answer choices. Do not include an Other option; the UI adds one automatically.",
    minItems: 1,
  }),
  multi: Type.Optional(Type.Boolean({ description: "Allow selecting multiple options" })),
  recommended: Type.Optional(
    Type.Number({ description: "Recommended option index (0-indexed). The UI highlights it." }),
  ),
});

const AskParams = Type.Object({
  questions: Type.Array(AskQuestionSchema, {
    description: "One or more related questions to ask together",
    minItems: 1,
  }),
});

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function displayOptionLabel(question: AskQuestion, optionIndex: number): string {
  const option = question.options[optionIndex];
  if (!option) return "";
  if (question.recommended === optionIndex && !option.label.endsWith(RECOMMENDED_SUFFIX)) {
    return `${option.label}${RECOMMENDED_SUFFIX}`;
  }
  return option.label;
}

function createInitialState(question: AskQuestion): QuestionState {
  return {
    selectedOptions: [],
    customInput: undefined,
    cursorIndex: clamp(question.recommended ?? 0, 0, Math.max(question.options.length - 1, 0)),
  };
}

function isAnswered(state: QuestionState): boolean {
  return Boolean(state.customInput?.trim()) || state.selectedOptions.length > 0;
}

function buildEntries(question: AskQuestion, state: QuestionState): Entry[] {
  const entries: Entry[] = question.options.map((option, optionIndex) => ({
    kind: "option",
    option,
    optionIndex,
  }));

  if (question.multi && state.selectedOptions.length > 0) {
    entries.push({ kind: "done" });
  }

  entries.push({ kind: "other" });
  return entries;
}

function syncCursor(question: AskQuestion, state: QuestionState): Entry[] {
  const entries = buildEntries(question, state);
  if (entries.length === 0) {
    state.cursorIndex = 0;
    return entries;
  }

  if (state.customInput) {
    const otherIndex = entries.findIndex((entry) => entry.kind === "other");
    if (otherIndex >= 0) {
      state.cursorIndex = otherIndex;
      return entries;
    }
  }

  if (!question.multi && state.selectedOptions.length > 0) {
    const selectedIndex = question.options.findIndex((option) => option.label === state.selectedOptions[0]);
    if (selectedIndex >= 0) {
      state.cursorIndex = selectedIndex;
      return entries;
    }
  }

  state.cursorIndex = clamp(state.cursorIndex, 0, entries.length - 1);
  return entries;
}

function buildResults(questions: AskQuestion[], states: QuestionState[]): QuestionResult[] {
  return questions.map((question, index) => ({
    id: question.id,
    question: question.question,
    options: question.options.map((option) => option.label),
    multi: question.multi === true,
    selectedOptions: [...states[index]!.selectedOptions],
    customInput: states[index]!.customInput,
  }));
}

function formatQuestionResult(result: QuestionResult): string {
  if (result.customInput) {
    return `${result.id}: ${result.customInput}`;
  }
  if (result.selectedOptions.length === 0) {
    return `${result.id}: (no answer)`;
  }
  if (result.multi) {
    return `${result.id}: [${result.selectedOptions.join(", ")}]`;
  }
  return `${result.id}: ${result.selectedOptions[0]}`;
}

function buildSingleDetails(result: QuestionResult, cancelled: boolean): AskDetails {
  return {
    question: result.question,
    options: result.options,
    multi: result.multi,
    selectedOptions: result.selectedOptions,
    customInput: result.customInput,
    cancelled,
  };
}

export default function ask(pi: ExtensionAPI) {
  pi.registerTool({
    name: "ask",
    label: "Ask",
    description: "Ask the user to clarify a decision when multiple materially different options exist.",
    promptSnippet:
      "Ask the user one or more focused clarifying questions when their decision materially changes implementation.",
    promptGuidelines: [
      "Default to action. Read code, configs, docs, and prior context before asking.",
      "Only ask when the user should weigh materially different tradeoffs.",
      "Use a single ask call with multiple related questions instead of asking one at a time.",
      "Do not include an Other option; the UI adds it automatically.",
      "Prefer 2-5 concise options and use recommended when one default is best.",
    ],
    parameters: AskParams,

    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      if (!ctx.hasUI) {
        return {
          content: [{ type: "text", text: "Error: ask requires interactive UI" }],
          details: { cancelled: true } as AskDetails,
        };
      }

      if (params.questions.length === 0) {
        return {
          content: [{ type: "text", text: "Error: questions must not be empty" }],
          details: { cancelled: true } as AskDetails,
        };
      }

      const questions = params.questions as AskQuestion[];

      const dialogResult = await ctx.ui.custom<AskDialogResult>((tui, theme, _keybindings, done) => {
        const states = questions.map(createInitialState);
        let questionIndex = 0;
        let inputMode = false;
        let cachedLines: string[] | undefined;
        let closed = false;

        const editorTheme: EditorTheme = {
          borderColor: (text) => theme.fg("accent", text),
          selectList: {
            selectedPrefix: (text) => theme.fg("accent", text),
            selectedText: (text) => theme.fg("accent", text),
            description: (text) => theme.fg("muted", text),
            scrollInfo: (text) => theme.fg("dim", text),
            noMatch: (text) => theme.fg("warning", text),
          },
        };
        const editor = new Editor(tui, editorTheme);

        const refresh = () => {
          cachedLines = undefined;
          tui.requestRender();
        };

        const finish = (cancelled: boolean) => {
          if (closed) return;
          closed = true;
          done({
            cancelled,
            results: buildResults(questions, states),
          });
        };

        const moveToQuestion = (nextIndex: number) => {
          questionIndex = clamp(nextIndex, 0, questions.length - 1);
          syncCursor(questions[questionIndex]!, states[questionIndex]!);
          refresh();
        };

        const moveForward = () => {
          if (questionIndex >= questions.length - 1) {
            finish(false);
            return;
          }
          moveToQuestion(questionIndex + 1);
        };

        const abortHandler = () => finish(true);
        signal?.addEventListener("abort", abortHandler);

        editor.onSubmit = (value) => {
          const trimmed = value.trim();
          const state = states[questionIndex]!;

          if (trimmed.length > 0) {
            state.customInput = trimmed;
            state.selectedOptions = [];
            inputMode = false;
            editor.setText("");
            moveForward();
            return;
          }

          inputMode = false;
          editor.setText(state.customInput ?? "");
          refresh();
        };

        return {
          render(width: number): string[] {
            if (cachedLines) return cachedLines;

            const question = questions[questionIndex]!;
            const state = states[questionIndex]!;
            const entries = syncCursor(question, state);
            const lines: string[] = [];
            const add = (line: string = "") => lines.push(truncateToWidth(line, width));

            add(theme.fg("accent", "─".repeat(Math.max(width, 1))));

            if (questions.length > 1) {
              const tabs = questions
                .map((item, index) => {
                  const answered = isAnswered(states[index]!);
                  const label = ` ${answered ? "■" : "□"} ${item.id} `;
                  if (index === questionIndex) {
                    return theme.bg("selectedBg", theme.fg("text", label));
                  }
                  return theme.fg(answered ? "success" : "muted", label);
                })
                .join(" ");
              add(` ${tabs}`);
              add();
            }

            const titlePrefix = questions.length > 1 ? `${questionIndex + 1}/${questions.length} [${question.id}] ` : "";
            add(theme.fg("text", ` ${titlePrefix}${question.question}`));

            const meta: string[] = [];
            if (question.multi) meta.push("multi-select");
            if (question.recommended !== undefined) meta.push(`recommended ${question.recommended + 1}`);
            if (meta.length > 0) {
              add(theme.fg("dim", ` ${meta.join(" • ")}`));
            }

            add();

            for (let index = 0; index < entries.length; index += 1) {
              const entry = entries[index]!;
              const active = index === state.cursorIndex;
              const prefix = active ? theme.fg("accent", "> ") : "  ";

              if (entry.kind === "option") {
                const optionLabel = displayOptionLabel(question, entry.optionIndex);
                if (question.multi) {
                  const checked = state.selectedOptions.includes(entry.option.label);
                  const checkbox = checked ? theme.fg("success", "✓") : theme.fg("dim", "○");
                  const optionText = active ? theme.fg("accent", optionLabel) : theme.fg("text", optionLabel);
                  add(`${prefix}${checkbox} ${optionText}`);
                } else {
                  const selected = state.selectedOptions[0] === entry.option.label;
                  const bullet = selected ? theme.fg("success", "✓ ") : "";
                  const optionText = active ? theme.fg("accent", optionLabel) : theme.fg("text", optionLabel);
                  add(`${prefix}${bullet}${optionText}`);
                }

                if (entry.option.description) {
                  add(`    ${theme.fg("muted", entry.option.description)}`);
                }
                continue;
              }

              if (entry.kind === "done") {
                const doneText = active ? theme.fg("accent", DONE_MULTI_LABEL) : theme.fg("success", DONE_MULTI_LABEL);
                add(`${prefix}${theme.fg("success", "✓")} ${doneText}`);
                continue;
              }

              const otherSelected = Boolean(state.customInput);
              const otherText = active
                ? theme.fg("accent", OTHER_OPTION_LABEL)
                : theme.fg(otherSelected ? "success" : "text", OTHER_OPTION_LABEL);
              add(`${prefix}${otherSelected ? theme.fg("success", "✎ ") : ""}${otherText}`);
            }

            add();

            if (inputMode) {
              add(theme.fg("muted", " Custom response:"));
              for (const line of editor.render(Math.max(width - 2, 1))) {
                add(` ${line}`);
              }
              add();
              add(theme.fg("dim", " Enter submit • Esc back"));
            } else {
              if (state.customInput) {
                add(theme.fg("muted", ` Current: ${state.customInput}`));
                add();
              } else if (state.selectedOptions.length > 0) {
                add(theme.fg("muted", ` Selected: ${state.selectedOptions.join(", ")}`));
                add();
              }

              const navigationHint = questions.length > 1 ? " • Tab/←→ question" : "";
              const selectHint = question.multi ? " Enter/Space toggle" : " Enter select";
              add(theme.fg("dim", ` ↑↓ move •${selectHint}${navigationHint} • Esc cancel`));
            }

            add(theme.fg("accent", "─".repeat(Math.max(width, 1))));
            cachedLines = lines;
            return lines;
          },

          invalidate() {
            cachedLines = undefined;
          },

          handleInput(data: string) {
            const question = questions[questionIndex]!;
            const state = states[questionIndex]!;
            const entries = syncCursor(question, state);

            if (inputMode) {
              if (matchesKey(data, Key.escape)) {
                inputMode = false;
                editor.setText(state.customInput ?? "");
                refresh();
                return;
              }
              editor.handleInput(data);
              refresh();
              return;
            }

            if (matchesKey(data, Key.up)) {
              state.cursorIndex = clamp(state.cursorIndex - 1, 0, Math.max(entries.length - 1, 0));
              refresh();
              return;
            }

            if (matchesKey(data, Key.down)) {
              state.cursorIndex = clamp(state.cursorIndex + 1, 0, Math.max(entries.length - 1, 0));
              refresh();
              return;
            }

            if (questions.length > 1 && (matchesKey(data, Key.tab) || matchesKey(data, Key.right))) {
              moveToQuestion(Math.min(questionIndex + 1, questions.length - 1));
              return;
            }

            if (questions.length > 1 && (matchesKey(data, Key.shift("tab")) || matchesKey(data, Key.left))) {
              moveToQuestion(Math.max(questionIndex - 1, 0));
              return;
            }

            if (matchesKey(data, Key.escape)) {
              finish(true);
              return;
            }

            const wantsSelection = matchesKey(data, Key.enter) || (question.multi && matchesKey(data, Key.space));
            if (!wantsSelection) return;

            const selectedEntry = entries[state.cursorIndex];
            if (!selectedEntry) return;

            if (selectedEntry.kind === "option") {
              const label = selectedEntry.option.label;
              if (question.multi) {
                if (state.selectedOptions.includes(label)) {
                  state.selectedOptions = state.selectedOptions.filter((value) => value !== label);
                } else {
                  state.selectedOptions = [...state.selectedOptions, label];
                }
                state.customInput = undefined;
                refresh();
                return;
              }

              state.selectedOptions = [label];
              state.customInput = undefined;
              moveForward();
              return;
            }

            if (selectedEntry.kind === "other") {
              inputMode = true;
              editor.setText(state.customInput ?? "");
              refresh();
              return;
            }

            moveForward();
          },

          dispose() {
            signal?.removeEventListener("abort", abortHandler);
          },
        };
      });

      const [firstResult] = dialogResult.results;

      if (questions.length === 1 && firstResult) {
        const details = buildSingleDetails(firstResult, dialogResult.cancelled);

        if (dialogResult.cancelled) {
          return {
            content: [{ type: "text", text: "User cancelled the ask dialog" }],
            details,
          };
        }

        if (firstResult.customInput) {
          return {
            content: [{ type: "text", text: `User provided custom input: ${firstResult.customInput}` }],
            details,
          };
        }

        if (firstResult.selectedOptions.length > 0) {
          const response = firstResult.multi
            ? `User selected: ${firstResult.selectedOptions.join(", ")}`
            : `User selected: ${firstResult.selectedOptions[0]}`;
          return {
            content: [{ type: "text", text: response }],
            details,
          };
        }

        return {
          content: [{ type: "text", text: "User left the question unanswered" }],
          details,
        };
      }

      const details: AskDetails = {
        results: dialogResult.results,
        cancelled: dialogResult.cancelled,
      };

      if (dialogResult.cancelled) {
        return {
          content: [{ type: "text", text: "User cancelled the ask dialog" }],
          details,
        };
      }

      return {
        content: [{ type: "text", text: `User answers:\n${dialogResult.results.map(formatQuestionResult).join("\n")}` }],
        details,
      };
    },

    renderCall(args, theme) {
      const questions = Array.isArray(args.questions) ? (args.questions as AskQuestion[]) : [];

      if (questions.length === 0) {
        return new Text(theme.fg("warning", "ask called without questions"), 0, 0);
      }

      if (questions.length === 1) {
        const [question] = questions;
        const meta: string[] = [];
        if (question.multi) meta.push("multi-select");
        if (question.recommended !== undefined) meta.push(`recommended ${question.recommended + 1}`);

        let text = theme.fg("toolTitle", theme.bold("ask ")) + theme.fg("muted", question.question);
        if (meta.length > 0) {
          text += theme.fg("dim", ` • ${meta.join(" • ")}`);
        }

        if (question.options.length > 0) {
          const renderedOptions = question.options
            .map((option, optionIndex) => `${optionIndex + 1}. ${displayOptionLabel(question, optionIndex)}`)
            .concat(OTHER_OPTION_LABEL)
            .join(", ");
          text += `\n${theme.fg("dim", `  Options: ${renderedOptions}`)}`;
        }

        return new Text(text, 0, 0);
      }

      let text = theme.fg("toolTitle", theme.bold("ask ")) + theme.fg("muted", `${questions.length} questions`);
      for (const question of questions) {
        const meta: string[] = [];
        if (question.multi) meta.push("multi-select");
        if (question.recommended !== undefined) meta.push(`recommended ${question.recommended + 1}`);
        const metaText = meta.length > 0 ? theme.fg("dim", ` • ${meta.join(" • ")}`) : "";
        text += `\n${theme.fg("accent", `  [${question.id}] `)}${theme.fg("text", question.question)}${metaText}`;
      }

      return new Text(text, 0, 0);
    },

    renderResult(result, { expanded }, theme) {
      const details = result.details as AskDetails | undefined;
      if (!details) {
        const text = result.content[0];
        return new Text(text?.type === "text" ? text.text : "", 0, 0);
      }

      if (details.results && details.results.length > 0) {
        const header = details.cancelled
          ? theme.fg("warning", "Cancelled")
          : theme.fg("success", `✓ Answered ${details.results.length} question${details.results.length === 1 ? "" : "s"}`);

        if (!expanded) {
          return new Text(header, 0, 0);
        }

        const lines = details.results.flatMap((questionResult) => {
          if (questionResult.customInput) {
            return [
              `${theme.fg("success", "✓ ")}${theme.fg("accent", questionResult.id)}: ${theme.fg("text", questionResult.customInput)}`,
            ];
          }

          if (questionResult.selectedOptions.length > 0) {
            return questionResult.selectedOptions.map((option, index) => {
              const prefix = index === 0 ? `${theme.fg("success", "✓ ")}${theme.fg("accent", `${questionResult.id}:`)}` : "   ";
              return `${prefix} ${theme.fg("text", option)}`;
            });
          }

          return [
            `${theme.fg(details.cancelled ? "warning" : "dim", details.cancelled ? "! " : "• ")}${theme.fg("accent", questionResult.id)}: ${theme.fg("muted", "(no answer)")}`,
          ];
        });

        return new Text([header, ...lines].join("\n"), 0, 0);
      }

      if (details.cancelled) {
        return new Text(theme.fg("warning", "Cancelled"), 0, 0);
      }

      if (details.customInput) {
        if (!expanded) {
          return new Text(theme.fg("success", "✓ Answered"), 0, 0);
        }

        return new Text(
          `${theme.fg("success", "✓ ")}${theme.fg("muted", "(wrote) ")}${theme.fg("accent", details.customInput)}`,
          0,
          0,
        );
      }

      const selectedOptions = details.selectedOptions ?? [];
      if (selectedOptions.length > 0) {
        if (!expanded) {
          return new Text(theme.fg("success", "✓ Answered"), 0, 0);
        }

        return new Text(
          `${theme.fg("success", "✓ ")}${theme.fg("accent", selectedOptions.join(", "))}`,
          0,
          0,
        );
      }

      return new Text(theme.fg("muted", "No answer"), 0, 0);
    },
  });
}
