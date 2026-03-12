import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { AssistantMessage, TextContent } from "@mariozechner/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Key } from "@mariozechner/pi-tui";
import { extractTodoItems, isSafeCommand, markCompletedSteps, type TodoItem } from "./utils.js";

const PLAN_MODE_TOOLS = ["read", "bash", "grep", "find", "ls", "ask"];

type PlanModeState = {
  enabled?: boolean;
  executing?: boolean;
  todos?: TodoItem[];
  normalTools?: string[];
};

function isAssistantMessage(message: AgentMessage): message is AssistantMessage {
  return message.role === "assistant" && Array.isArray(message.content);
}

function getTextContent(message: AssistantMessage): string {
  return message.content
    .filter((block): block is TextContent => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

export default function planModeExtension(pi: ExtensionAPI): void {
  let planModeEnabled = false;
  let executionMode = false;
  let todoItems: TodoItem[] = [];
  let normalTools: string[] = [];

  pi.registerFlag("plan", {
    description: "Start in plan mode (read-only exploration)",
    type: "boolean",
    default: false,
  });

  function persistState(): void {
    pi.appendEntry("plan-mode", {
      enabled: planModeEnabled,
      executing: executionMode,
      todos: todoItems,
      normalTools,
    });
  }

  function updateStatus(ctx: ExtensionContext): void {
    if (executionMode && todoItems.length > 0) {
      const completed = todoItems.filter((item) => item.completed).length;
      ctx.ui.setStatus("plan-mode", ctx.ui.theme.fg("accent", `📋 ${completed}/${todoItems.length}`));
    } else if (planModeEnabled) {
      ctx.ui.setStatus("plan-mode", ctx.ui.theme.fg("warning", "⏸ plan"));
    } else {
      ctx.ui.setStatus("plan-mode", undefined);
    }

    if (executionMode && todoItems.length > 0) {
      const lines = todoItems.map((item) => {
        if (item.completed) {
          return ctx.ui.theme.fg("success", "☑ ") + ctx.ui.theme.fg("muted", ctx.ui.theme.strikethrough(item.text));
        }
        return `${ctx.ui.theme.fg("muted", "☐ ")}${item.text}`;
      });
      ctx.ui.setWidget("plan-todos", lines);
      return;
    }

    ctx.ui.setWidget("plan-todos", undefined);
  }

  function ensureNormalTools(): void {
    if (normalTools.length === 0) {
      normalTools = pi.getActiveTools();
    }
  }

  function setPlanTools(): void {
    const allowed = new Set(PLAN_MODE_TOOLS);
    const tools = pi.getAllTools().map((tool) => tool.name).filter((name) => allowed.has(name));
    pi.setActiveTools(tools);
  }

  function restoreNormalTools(): void {
    const available = new Set(pi.getAllTools().map((tool) => tool.name));
    const tools = normalTools.filter((name) => available.has(name));
    pi.setActiveTools(tools.length > 0 ? tools : Array.from(available));
  }

  function togglePlanMode(ctx: ExtensionContext): void {
    if (!planModeEnabled) {
      ensureNormalTools();
      planModeEnabled = true;
      executionMode = false;
      todoItems = [];
      setPlanTools();
      ctx.ui.notify(`Plan mode enabled. Tools: ${pi.getActiveTools().join(", ")}`, "info");
    } else {
      planModeEnabled = false;
      executionMode = false;
      todoItems = [];
      restoreNormalTools();
      ctx.ui.notify("Plan mode disabled. Full access restored.", "info");
    }

    persistState();
    updateStatus(ctx);
  }

  pi.registerCommand("plan", {
    description: "Toggle plan mode (read-only exploration)",
    handler: async (_args, ctx) => togglePlanMode(ctx),
  });

  pi.registerCommand("todos", {
    description: "Show current plan todo list",
    handler: async (_args, ctx) => {
      if (todoItems.length === 0) {
        ctx.ui.notify("No todos. Create a plan first with /plan", "info");
        return;
      }
      const list = todoItems.map((item, index) => `${index + 1}. ${item.completed ? "✓" : "○"} ${item.text}`).join("\n");
      ctx.ui.notify(`Plan Progress:\n${list}`, "info");
    },
  });

  pi.registerShortcut(Key.ctrlAlt("p"), {
    description: "Toggle plan mode",
    handler: async (ctx) => togglePlanMode(ctx),
  });

  pi.on("tool_call", async (event) => {
    if (!planModeEnabled || event.toolName !== "bash") return;

    const command = event.input.command as string;
    if (!isSafeCommand(command)) {
      return {
        block: true,
        reason: `Plan mode blocked a non-read-only command. Disable /plan first.\nCommand: ${command}`,
      };
    }
  });

  pi.on("context", async (event) => {
    const hiddenTypes = new Set([
      "plan-mode-context",
      "plan-execution-context",
      "plan-todo-list",
      "plan-mode-execute",
      "plan-complete",
    ]);

    return {
      messages: event.messages.filter((message) => {
        const candidate = message as AgentMessage & { customType?: string };
        return !candidate.customType || !hiddenTypes.has(candidate.customType);
      }),
    };
  });

  pi.on("before_agent_start", async () => {
    if (planModeEnabled) {
      return {
        message: {
          customType: "plan-mode-context",
          content: `[PLAN MODE ACTIVE]\nYou are in plan mode, a read-only exploration mode for safe analysis.\n\nRestrictions:\n- Use only read-only tools: read, bash, grep, find, ls, ask\n- Do not use edit, write, or any mutating commands\n- Bash is restricted to an allowlist of read-only commands\n\nIf a decision materially changes implementation, use the ask tool.\n\nProduce a concrete numbered plan under a \"Plan:\" header:\n\nPlan:\n1. First step\n2. Second step\n...\n\nDo not make changes. Only analyze and plan.`,
          display: false,
        },
      };
    }

    if (executionMode && todoItems.length > 0) {
      const remaining = todoItems.filter((item) => !item.completed);
      const todoList = remaining.map((item) => `${item.step}. ${item.text}`).join("\n");
      return {
        message: {
          customType: "plan-execution-context",
          content: `[EXECUTING PLAN - Full tool access enabled]\n\nRemaining steps:\n${todoList}\n\nExecute each step in order.\nAfter completing a step, include a [DONE:n] tag in your response.`,
          display: false,
        },
      };
    }
  });

  pi.on("turn_end", async (event, ctx) => {
    if (!executionMode || todoItems.length === 0) return;
    if (!isAssistantMessage(event.message)) return;

    const text = getTextContent(event.message);
    if (markCompletedSteps(text, todoItems) > 0) {
      updateStatus(ctx);
      persistState();
    }
  });

  pi.on("agent_end", async (event, ctx) => {
    if (executionMode && todoItems.length > 0) {
      if (todoItems.every((item) => item.completed)) {
        const completedList = todoItems.map((item) => `~~${item.text}~~`).join("\n");
        pi.sendMessage(
          { customType: "plan-complete", content: `**Plan Complete!** ✓\n\n${completedList}`, display: true },
          { triggerTurn: false },
        );
        executionMode = false;
        todoItems = [];
        restoreNormalTools();
        updateStatus(ctx);
        persistState();
      }
      return;
    }

    if (!planModeEnabled || !ctx.hasUI) return;

    const lastAssistant = [...event.messages].reverse().find(isAssistantMessage);
    if (lastAssistant) {
      const extracted = extractTodoItems(getTextContent(lastAssistant));
      if (extracted.length > 0) {
        todoItems = extracted;
      }
    }

    if (todoItems.length > 0) {
      const todoListText = todoItems.map((item, index) => `${index + 1}. ☐ ${item.text}`).join("\n");
      pi.sendMessage(
        {
          customType: "plan-todo-list",
          content: `**Plan Steps (${todoItems.length}):**\n\n${todoListText}`,
          display: true,
        },
        { triggerTurn: false },
      );
    }

    const choice = await ctx.ui.select("Plan mode - what next?", [
      todoItems.length > 0 ? "Execute the plan (track progress)" : "Execute the plan",
      "Stay in plan mode",
      "Refine the plan",
    ]);

    if (choice?.startsWith("Execute")) {
      planModeEnabled = false;
      executionMode = todoItems.length > 0;
      restoreNormalTools();
      updateStatus(ctx);
      persistState();

      const execMessage =
        todoItems.length > 0
          ? `Execute the plan. Start with: ${todoItems[0]?.text ?? "the first step"}`
          : "Execute the plan you just created.";
      pi.sendMessage(
        { customType: "plan-mode-execute", content: execMessage, display: true },
        { triggerTurn: true },
      );
      return;
    }

    if (choice === "Refine the plan") {
      const refinement = await ctx.ui.editor("Refine the plan:", "");
      persistState();
      if (refinement?.trim()) {
        pi.sendUserMessage(refinement.trim());
      }
      return;
    }

    persistState();
  });

  pi.on("session_start", async (_event, ctx) => {
    normalTools = pi.getActiveTools();

    const state = ctx.sessionManager
      .getEntries()
      .filter((entry: { type: string; customType?: string }) => entry.type === "custom" && entry.customType === "plan-mode")
      .pop() as { data?: PlanModeState } | undefined;

    if (state?.data) {
      planModeEnabled = state.data.enabled ?? planModeEnabled;
      executionMode = state.data.executing ?? executionMode;
      todoItems = state.data.todos ?? todoItems;
      normalTools = state.data.normalTools ?? normalTools;
    }

    if (pi.getFlag("plan") === true) {
      planModeEnabled = true;
      executionMode = false;
      todoItems = [];
    }

    if (executionMode && todoItems.length > 0) {
      const entries = ctx.sessionManager.getEntries();
      let executeIndex = -1;
      for (let index = entries.length - 1; index >= 0; index -= 1) {
        const entry = entries[index] as { customType?: string };
        if (entry.customType === "plan-mode-execute") {
          executeIndex = index;
          break;
        }
      }

      const messages: AssistantMessage[] = [];
      for (let index = executeIndex + 1; index < entries.length; index += 1) {
        const entry = entries[index];
        if (entry.type === "message" && "message" in entry && isAssistantMessage(entry.message as AgentMessage)) {
          messages.push(entry.message as AssistantMessage);
        }
      }
      markCompletedSteps(messages.map(getTextContent).join("\n"), todoItems);
    }

    if (planModeEnabled) {
      setPlanTools();
    } else {
      restoreNormalTools();
    }

    updateStatus(ctx);
  });
}
