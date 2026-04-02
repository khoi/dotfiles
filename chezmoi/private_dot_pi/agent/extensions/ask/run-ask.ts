import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Editor, type EditorTheme, Key, matchesKey, Text, truncateToWidth, wrapTextWithAnsi } from "@mariozechner/pi-tui";
import type { AskAnswer, AskOption, AskQuestion, AskQuestionInput, AskResult } from "./types.ts";

type RenderOption = AskOption & { isOther?: boolean; baseIndex?: number };

export function errorResult(
	message: string,
	questions: AskQuestion[] = [],
): { content: { type: "text"; text: string }[]; details: AskResult } {
	return {
		content: [{ type: "text", text: message }],
		details: { status: "error", questions, answers: [], error: message },
	};
}

export function normalizeQuestions(rawQuestions: AskQuestionInput[]): AskQuestion[] {
	const ids = new Set<string>();

	return rawQuestions.map((question, index) => {
		if (ids.has(question.id)) {
			throw new Error(`Error: Duplicate question id: ${question.id}`);
		}
		ids.add(question.id);

		const type = question.type ?? ((question.options?.length ?? 0) > 0 ? "select" : "text");
		const options = (question.options ?? []).map((option) => ({
			value: option.value?.trim() || option.label,
			label: option.label,
			description: option.description,
		}));

		if (type === "select" && options.length === 0) {
			throw new Error(`Error: Question ${question.id} must include at least one option for type select`);
		}

		const recommended =
			type === "select" && question.recommended !== undefined && question.recommended >= 0 && question.recommended < options.length
				? question.recommended
				: undefined;

		return {
			id: question.id,
			label: question.label || `Q${index + 1}`,
			question: question.question,
			type,
			context: question.context,
			options,
			multi: type === "select" && question.multi === true,
			recommended,
			allowOther: type === "select" ? question.allowOther !== false : false,
			required: question.required !== false,
			placeholder: question.placeholder,
		};
	});
}

export function formatAnswerValue(value: string | string[]): string {
	return Array.isArray(value) ? value.join(", ") : value;
}

export function formatSummary(questions: AskQuestion[], answers: AskAnswer[]): string {
	if (answers.length === 0) {
		return "No answers provided";
	}
	return answers
		.map((answer) => {
			const label = questions.find((question) => question.id === answer.id)?.label || answer.label;
			return `${label}: ${formatAnswerValue(answer.displayValue)}`;
		})
		.join("\n");
}

export function formatAnswersForUserMessage(questions: AskQuestion[], answers: AskAnswer[]): string {
	if (answers.length === 0) {
		return "I do not have any additional answers right now.";
	}

	const blocks = answers.map((answer) => {
		const question = questions.find((item) => item.id === answer.id);
		const lines = [`Q: ${question?.question || answer.label}`];
		if (question?.context) {
			lines.push(`> ${question.context}`);
		}
		lines.push(`A: ${formatAnswerValue(answer.displayValue)}`);
		return lines.join("\n");
	});

	return `I answered your questions in the following way:\n\n${blocks.join("\n\n")}`;
}

export function formatToolResult(result: AskResult): { content: { type: "text"; text: string }[]; details: AskResult } {
	if (result.status === "error") {
		return {
			content: [{ type: "text", text: result.error || "Error" }],
			details: result,
		};
	}

	if (result.status === "cancelled") {
		return {
			content: [{ type: "text", text: "User cancelled the prompt" }],
			details: result,
		};
	}

	return {
		content: [{ type: "text", text: formatSummary(result.questions, result.answers) }],
		details: result,
	};
}

export async function runAskPrompt(ctx: ExtensionContext, questions: AskQuestion[]): Promise<AskResult> {
	return ctx.ui.custom<AskResult>((tui, theme, _kb, done) => {
		let currentTab = 0;
		let inputMode = false;
		let confirmMode = false;
		let cachedLines: string[] | undefined;
		const isMultiQuestion = questions.length > 1;
		const totalTabs = isMultiQuestion ? questions.length + 1 : questions.length;
		const optionIndices = new Map<string, number>();
		const selectedIndices = new Map<string, Set<number>>();
		const textValues = new Map<string, string>();

		const editorTheme: EditorTheme = {
			borderColor: (s) => theme.fg("accent", s),
			selectList: {
				selectedPrefix: (t) => theme.fg("accent", t),
				selectedText: (t) => theme.fg("accent", t),
				description: (t) => theme.fg("muted", t),
				scrollInfo: (t) => theme.fg("dim", t),
				noMatch: (t) => theme.fg("warning", t),
			},
		};
		const editor = new Editor(tui, editorTheme);
		editor.disableSubmit = true;
		editor.onChange = () => {
			const question = currentQuestion();
			if (!question) {
				return;
			}
			textValues.set(question.id, editor.getText());
			refresh();
		};

		function refresh() {
			cachedLines = undefined;
			tui.requestRender();
		}

		function currentQuestion(): AskQuestion | undefined {
			return currentTab < questions.length ? questions[currentTab] : undefined;
		}

		function isSubmitTab() {
			return isMultiQuestion && currentTab === questions.length;
		}

		function isTextQuestion(question: AskQuestion | undefined) {
			return question?.type === "text" || question?.type === "textarea";
		}

		function currentOptions(question: AskQuestion): RenderOption[] {
			const options: RenderOption[] = question.options.map((option, index) => ({ ...option, baseIndex: index }));
			if (question.allowOther) {
				options.push({ value: "__other__", label: "Other (type your own)", isOther: true });
			}
			return options;
		}

		function currentOptionIndex(question: AskQuestion): number {
			const stored = optionIndices.get(question.id);
			if (stored !== undefined) {
				return Math.max(0, Math.min(currentOptions(question).length - 1, stored));
			}
			return question.recommended ?? 0;
		}

		function setCurrentOptionIndex(question: AskQuestion, index: number) {
			optionIndices.set(question.id, index);
		}

		function getCustomValue(questionId: string): string | undefined {
			const value = textValues.get(questionId)?.trim();
			return value ? value : undefined;
		}

		function getAnswer(question: AskQuestion): AskAnswer | undefined {
			if (question.type === "text" || question.type === "textarea") {
				const value = textValues.get(question.id)?.trim();
				if (!value) {
					return undefined;
				}
				return {
					id: question.id,
					label: question.label,
					type: question.type,
					value,
					displayValue: value,
					source: "text",
				};
			}

			const selected = Array.from(selectedIndices.get(question.id) ?? []).sort((left, right) => left - right);
			const customValue = getCustomValue(question.id);

			if (question.multi) {
				const values = selected.map((index) => question.options[index]?.value).filter((value): value is string => !!value);
				const labels = selected.map((index) => question.options[index]?.label).filter((value): value is string => !!value);

				if (customValue) {
					values.push(customValue);
					labels.push(customValue);
				}

				if (values.length === 0) {
					return undefined;
				}

				return {
					id: question.id,
					label: question.label,
					type: question.type,
					value: values,
					displayValue: labels,
					source: customValue ? (selected.length > 0 ? "mixed" : "custom") : "option",
					indices: selected.length > 0 ? selected.map((index) => index + 1) : undefined,
				};
			}

			if (customValue) {
				return {
					id: question.id,
					label: question.label,
					type: question.type,
					value: customValue,
					displayValue: customValue,
					source: "custom",
				};
			}

			const index = selected[0];
			if (index === undefined) {
				return undefined;
			}

			const option = question.options[index];
			return {
				id: question.id,
				label: question.label,
				type: question.type,
				value: option.value,
				displayValue: option.label,
				source: "option",
				indices: [index + 1],
			};
		}

		function getAnswers() {
			return questions.map((question) => getAnswer(question)).filter((answer): answer is AskAnswer => !!answer);
		}

		function allRequiredAnswered() {
			return questions.filter((question) => question.required).every((question) => !!getAnswer(question));
		}

		function setEditorTextForCurrentQuestion() {
			const question = currentQuestion();
			if (!question || (!inputMode && !isTextQuestion(question))) {
				editor.setText("");
				return;
			}
			editor.setText(textValues.get(question.id) ?? "");
		}

		function openOtherInput() {
			inputMode = true;
			confirmMode = false;
			setEditorTextForCurrentQuestion();
			refresh();
		}

		function closeOtherInput() {
			inputMode = false;
			setEditorTextForCurrentQuestion();
			refresh();
		}

		function advanceAfterQuestion() {
			inputMode = false;
			confirmMode = false;
			if (!isMultiQuestion) {
				done({ status: "submitted", questions, answers: getAnswers() });
				return;
			}
			if (currentTab < questions.length - 1) {
				currentTab += 1;
			} else {
				currentTab = questions.length;
			}
			setEditorTextForCurrentQuestion();
			refresh();
		}

		function selectSingleOption(question: AskQuestion, option: RenderOption) {
			if (option.isOther) {
				selectedIndices.delete(question.id);
				openOtherInput();
				return;
			}
			selectedIndices.set(question.id, new Set([option.baseIndex ?? 0]));
			textValues.delete(question.id);
			advanceAfterQuestion();
		}

		function toggleMultiOption(question: AskQuestion, option: RenderOption) {
			if (option.isOther) {
				if (getCustomValue(question.id)) {
					textValues.delete(question.id);
					refresh();
					return;
				}
				openOtherInput();
				return;
			}
			const next = new Set(selectedIndices.get(question.id) ?? []);
			if (next.has(option.baseIndex ?? 0)) {
				next.delete(option.baseIndex ?? 0);
			} else {
				next.add(option.baseIndex ?? 0);
			}
			if (next.size === 0) {
				selectedIndices.delete(question.id);
			} else {
				selectedIndices.set(question.id, next);
			}
			refresh();
		}

		function cancel() {
			done({ status: "cancelled", questions, answers: getAnswers() });
		}

		function submit() {
			done({ status: "submitted", questions, answers: getAnswers() });
		}

		function handleInput(data: string) {
			if (confirmMode) {
				if (matchesKey(data, Key.enter) || data.toLowerCase() === "y") {
					submit();
					return;
				}
				if (matchesKey(data, Key.escape) || matchesKey(data, Key.ctrl("c")) || data.toLowerCase() === "n") {
					confirmMode = false;
					refresh();
					return;
				}
				return;
			}

			if (matchesKey(data, Key.escape) || matchesKey(data, Key.ctrl("c"))) {
				if (inputMode) {
					closeOtherInput();
					return;
				}
				cancel();
				return;
			}

			if (isMultiQuestion) {
				if (matchesKey(data, Key.tab) || matchesKey(data, Key.right)) {
					currentTab = (currentTab + 1) % totalTabs;
					inputMode = false;
					confirmMode = false;
					setEditorTextForCurrentQuestion();
					refresh();
					return;
				}
				if (matchesKey(data, Key.shift("tab")) || matchesKey(data, Key.left)) {
					currentTab = (currentTab - 1 + totalTabs) % totalTabs;
					inputMode = false;
					confirmMode = false;
					setEditorTextForCurrentQuestion();
					refresh();
					return;
				}
			}

			if (isSubmitTab()) {
				if (matchesKey(data, Key.enter) && allRequiredAnswered()) {
					confirmMode = true;
					refresh();
				}
				return;
			}

			const question = currentQuestion();
			if (!question) {
				return;
			}

			if (inputMode) {
				if (matchesKey(data, Key.enter) && !matchesKey(data, Key.shift("enter"))) {
					const value = editor.getText().trim();
					if (value) {
						textValues.set(question.id, value);
					} else {
						textValues.delete(question.id);
					}
					inputMode = false;
					setEditorTextForCurrentQuestion();
					if (!question.multi) {
						advanceAfterQuestion();
						return;
					}
					refresh();
					return;
				}
				editor.handleInput(data);
				refresh();
				return;
			}

			if (question.type === "select") {
				const options = currentOptions(question);
				const optionIndex = currentOptionIndex(question);
				const option = options[optionIndex];

				if (matchesKey(data, Key.up)) {
					setCurrentOptionIndex(question, Math.max(0, optionIndex - 1));
					refresh();
					return;
				}
				if (matchesKey(data, Key.down)) {
					setCurrentOptionIndex(question, Math.min(options.length - 1, optionIndex + 1));
					refresh();
					return;
				}
				if (question.multi && matchesKey(data, Key.space)) {
					toggleMultiOption(question, option);
					return;
				}
				if (matchesKey(data, Key.enter)) {
					if (question.multi) {
						if (option.isOther) {
							openOtherInput();
							return;
						}
						if (!question.required || getAnswer(question)) {
							advanceAfterQuestion();
						} else {
							refresh();
						}
						return;
					}
					selectSingleOption(question, option);
				}
				return;
			}

			if (matchesKey(data, Key.enter) && !matchesKey(data, Key.shift("enter"))) {
				const value = editor.getText().trim();
				if (value) {
					textValues.set(question.id, value);
				} else {
					textValues.delete(question.id);
				}
				if (!question.required || value) {
					advanceAfterQuestion();
				} else {
					refresh();
				}
				return;
			}

			editor.handleInput(data);
			refresh();
		}

		function render(width: number): string[] {
			if (cachedLines) {
				return cachedLines;
			}

			const safeWidth = Math.max(20, width);
			const contentWidth = Math.max(12, safeWidth - 2);
			const lines: string[] = [];
			const question = currentQuestion();

			const add = (line: string = "") => {
				lines.push(truncateToWidth(line, safeWidth));
			};

			const addWrapped = (line: string, color: "text" | "muted" | "dim" | "warning" | "success" | "accent" = "text") => {
				for (const wrapped of wrapTextWithAnsi(theme.fg(color, line), contentWidth)) {
					add(` ${wrapped}`);
				}
			};

			add(theme.fg("accent", "─".repeat(safeWidth)));

			if (isMultiQuestion) {
				const tabs: string[] = ["← "];
				for (let index = 0; index < questions.length; index += 1) {
					const item = questions[index];
					const answered = !!getAnswer(item);
					const active = currentTab === index;
					const marker = answered ? "■" : "□";
					const text = ` ${marker} ${item.label} `;
					tabs.push(active ? `${theme.bg("selectedBg", theme.fg("text", text))} ` : `${theme.fg(answered ? "success" : "muted", text)} `);
				}
				const submitText = " ✓ Submit ";
				tabs.push(
					currentTab === questions.length
						? `${theme.bg("selectedBg", theme.fg("text", submitText))} →`
						: `${theme.fg(allRequiredAnswered() ? "success" : "dim", submitText)} →`,
				);
				add(` ${tabs.join("")}`);
				add();
			}

			if (isSubmitTab()) {
				add(theme.fg("accent", theme.bold(" Ready to submit")));
				add();
				for (const item of questions) {
					const answer = getAnswer(item);
					if (answer) {
						add(`${theme.fg("muted", ` ${item.label}: `)}${theme.fg("text", formatAnswerValue(answer.displayValue))}`);
					} else if (item.required) {
						add(`${theme.fg("warning", ` ${item.label}: required`)}`);
					}
				}
				add();
				if (confirmMode) {
					add(theme.fg("warning", " Submit answers?"));
					add(theme.fg("dim", " Enter/y confirm • Esc/n back"));
				} else if (allRequiredAnswered()) {
					add(theme.fg("success", " Press Enter to review and submit"));
				} else {
					const missing = questions.filter((item) => item.required && !getAnswer(item)).map((item) => item.label).join(", ");
					add(theme.fg("warning", ` Missing required answers: ${missing}`));
				}
			} else if (question) {
				const answer = getAnswer(question);
				addWrapped(question.question);
				if (question.context) {
					add();
					addWrapped(question.context, "muted");
				}
				if (question.placeholder && (inputMode || isTextQuestion(question)) && !editor.getText()) {
					add();
					add(theme.fg("dim", ` ${question.placeholder}`));
				}
				add();

				if (question.type === "select") {
					const options = currentOptions(question);
					const cursorIndex = currentOptionIndex(question);
					const selected = selectedIndices.get(question.id) ?? new Set<number>();
					const customValue = getCustomValue(question.id);
					for (let index = 0; index < options.length; index += 1) {
						const option = options[index];
						const cursor = cursorIndex === index ? theme.fg("accent", "> ") : "  ";
						const checked = option.isOther ? !!customValue : selected.has(option.baseIndex ?? -1);
						const marker = question.multi ? (checked ? "[x]" : "[ ]") : checked ? "(•)" : "( )";
						let label = `${index + 1}. ${option.label}`;
						if (question.recommended === option.baseIndex) {
							label += " · recommended";
						}
						add(`${cursor}${theme.fg(cursorIndex === index ? "accent" : "text", `${marker} ${label}`)}`);
						if (option.description) {
							add(`     ${theme.fg("muted", option.description)}`);
						}
						if (option.isOther && customValue) {
							add(`     ${theme.fg("muted", customValue)}`);
						}
					}
					if (inputMode) {
						add();
						add(theme.fg("muted", " Your answer:"));
						for (const line of editor.render(Math.max(8, safeWidth - 2))) {
							add(` ${line}`);
						}
					}
					if (!inputMode && answer && !question.multi) {
						add();
						add(theme.fg("muted", ` Current answer: ${formatAnswerValue(answer.displayValue)}`));
					}
				} else {
					for (const line of editor.render(Math.max(8, safeWidth - 2))) {
						add(` ${line}`);
					}
				}
			}

			add();
			if (!isSubmitTab()) {
				const activeQuestion = currentQuestion();
				if (activeQuestion?.type === "select") {
					const help = activeQuestion.multi
						? isMultiQuestion
							? " Tab/←→ navigate • ↑↓ move • Space toggle • Enter continue • Esc cancel"
							: " ↑↓ move • Space toggle • Enter continue • Esc cancel"
						: isMultiQuestion
							? " Tab/←→ navigate • ↑↓ move • Enter select • Esc cancel"
							: " ↑↓ move • Enter select • Esc cancel";
					add(theme.fg("dim", help));
					if (inputMode) {
						add(theme.fg("dim", " Enter save • Esc back"));
					}
				} else if (activeQuestion?.type === "textarea") {
					add(
						theme.fg(
							"dim",
							isMultiQuestion
								? " Tab/←→ navigate • Enter confirm • Shift+Enter newline • Esc cancel"
								: " Enter confirm • Shift+Enter newline • Esc cancel",
						),
					);
				} else if (activeQuestion) {
					add(theme.fg("dim", isMultiQuestion ? " Tab/←→ navigate • Enter confirm • Esc cancel" : " Enter confirm • Esc cancel"));
				}
			}
			add(theme.fg("accent", "─".repeat(safeWidth)));

			cachedLines = lines;
			return lines;
		}

		setEditorTextForCurrentQuestion();

		return {
			render,
			invalidate: () => {
				cachedLines = undefined;
			},
			handleInput,
		};
	});
}

export function renderAskCall(args: { questions?: AskQuestionInput[] }, theme: { fg: (color: string, text: string) => string; bold: (text: string) => string }) {
	const questions = (args.questions || []).map((question, index) => question.label || question.id || `Q${index + 1}`);
	let text = theme.fg("toolTitle", theme.bold("ask "));
	text += theme.fg("muted", `${questions.length} question${questions.length === 1 ? "" : "s"}`);
	if (questions.length > 0) {
		text += theme.fg("dim", ` (${truncateToWidth(questions.join(", "), 40)})`);
	}
	return new Text(text, 0, 0);
}

export function renderAskResult(result: { content: { type: "text"; text: string }[]; details?: AskResult }, theme: { fg: (color: string, text: string) => string }) {
	const details = result.details;
	if (!details) {
		const text = result.content[0];
		return new Text(text?.type === "text" ? text.text : "", 0, 0);
	}
	if (details.status === "error") {
		return new Text(theme.fg("error", details.error || "Error"), 0, 0);
	}
	if (details.status === "cancelled") {
		return new Text(theme.fg("warning", "Cancelled"), 0, 0);
	}
	if (details.answers.length === 0) {
		return new Text(theme.fg("muted", "No answers provided"), 0, 0);
	}
	const lines = details.answers.map((answer) => {
		const value = formatAnswerValue(answer.displayValue);
		const source = answer.source === "option" ? "" : ` ${theme.fg("muted", `(${answer.source})`)}`;
		return `${theme.fg("success", "✓ ")}${theme.fg("accent", answer.label)}: ${value}${source}`;
	});
	return new Text(lines.join("\n"), 0, 0);
}
