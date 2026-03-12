import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
  createBashTool,
  createEditTool,
  createFindTool,
  createGrepTool,
  createLsTool,
  createReadTool,
  createWriteTool,
} from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { homedir } from "node:os";

type BuiltInTools = ReturnType<typeof createBuiltInTools>;
type BuiltInToolName = keyof BuiltInTools;

type ToolSummaryItem = {
  toolName: BuiltInToolName;
  call: string;
  output?: string;
  isError?: boolean;
};

type ToolSummaryDetails = {
  items: ToolSummaryItem[];
};

const CUSTOM_TYPE = "minimal-tool-summary";
const toolCache = new Map<string, BuiltInTools>();
const managedTools = new Set<BuiltInToolName>(["read", "bash", "edit", "write", "find", "grep", "ls"]);

function createBuiltInTools(cwd: string) {
  return {
    read: createReadTool(cwd),
    bash: createBashTool(cwd),
    edit: createEditTool(cwd),
    write: createWriteTool(cwd),
    find: createFindTool(cwd),
    grep: createGrepTool(cwd),
    ls: createLsTool(cwd),
  };
}

function getBuiltInTools(cwd: string): BuiltInTools {
  let tools = toolCache.get(cwd);
  if (!tools) {
    tools = createBuiltInTools(cwd);
    toolCache.set(cwd, tools);
  }
  return tools;
}

function shortenPath(path: string): string {
  const home = homedir();
  return path.startsWith(home) ? `~${path.slice(home.length)}` : path;
}

function summarizeCommand(command: string): string {
  const singleLine = command.replace(/\s+/g, " ").trim();
  return singleLine.length > 100 ? `${singleLine.slice(0, 97)}...` : singleLine;
}

function formatToolCall(toolName: BuiltInToolName, args: Record<string, any>): string {
  switch (toolName) {
    case "read": {
      const path = shortenPath(args.path || "...");
      const start = args.offset;
      const limit = args.limit;
      if (start !== undefined || limit !== undefined) {
        const first = start ?? 1;
        const last = limit !== undefined ? first + limit - 1 : "";
        return `${path}:${first}${last ? `-${last}` : ""}`;
      }
      return path;
    }
    case "bash":
      return summarizeCommand(args.command || "...");
    case "write": {
      const path = shortenPath(args.path || "...");
      const lineCount = typeof args.content === "string" ? args.content.split("\n").length : 0;
      return lineCount > 0 ? `${path} (${lineCount} lines)` : path;
    }
    case "edit":
      return shortenPath(args.path || "...");
    case "find":
      return `${args.pattern || ""} in ${shortenPath(args.path || ".")}`;
    case "grep": {
      const glob = args.glob ? ` (${args.glob})` : "";
      return `/${args.pattern || ""}/ in ${shortenPath(args.path || ".")}${glob}`;
    }
    case "ls":
      return shortenPath(args.path || ".");
  }
}

function extractPreview(content: Array<{ type: string; text?: string }>): string | undefined {
  const image = content.find((item) => item.type === "image");
  if (image) {
    return "[image]";
  }

  const text = content
    .filter((item): item is { type: "text"; text: string } => item.type === "text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("\n")
    .trim();

  if (!text) return undefined;

  const lines = text.split("\n");
  const preview = lines.slice(0, 6).join("\n");
  return lines.length > 6 ? `${preview}\n...` : preview;
}

function registerBuiltInTool(pi: ExtensionAPI, name: BuiltInToolName) {
  const tool = getBuiltInTools(process.cwd())[name];

  pi.registerTool({
    name,
    label: tool.label,
    description: tool.description,
    parameters: tool.parameters,

    async execute(toolCallId, params, signal, onUpdate, ctx) {
      return getBuiltInTools(ctx.cwd)[name].execute(toolCallId, params, signal, onUpdate);
    },

    renderCall() {
      return undefined;
    },

    renderResult() {
      return undefined;
    },
  });
}

export default function minimalToolOutput(pi: ExtensionAPI) {
  let items: ToolSummaryItem[] = [];
  let itemIndexByCallId = new Map<string, number>();

  const resetTurn = () => {
    items = [];
    itemIndexByCallId = new Map();
  };

  for (const toolName of managedTools) {
    registerBuiltInTool(pi, toolName);
  }

  pi.on("turn_start", async () => {
    resetTurn();
  });

  pi.on("tool_call", async (event) => {
    if (!managedTools.has(event.toolName as BuiltInToolName)) return;
    const toolName = event.toolName as BuiltInToolName;
    itemIndexByCallId.set(event.toolCallId, items.length);
    items.push({
      toolName,
      call: formatToolCall(toolName, event.input as Record<string, any>),
    });
  });

  pi.on("tool_result", async (event) => {
    if (!managedTools.has(event.toolName as BuiltInToolName)) return;
    const index = itemIndexByCallId.get(event.toolCallId);
    if (index === undefined) return;
    const item = items[index];
    if (!item) return;
    item.output = extractPreview(event.content as Array<{ type: string; text?: string }>);
    item.isError = event.isError;
  });

  pi.on("turn_end", async (_event, ctx) => {
    if (!ctx.hasUI || items.length === 0) return;

    pi.sendMessage(
      {
        customType: CUSTOM_TYPE,
        content: "",
        display: true,
        details: { items: items.map((item) => ({ ...item })) } satisfies ToolSummaryDetails,
      },
      { triggerTurn: false },
    );
  });

  pi.on("context", async (event) => ({
    messages: event.messages.filter((message) => {
      const candidate = message as { customType?: string };
      return candidate.customType !== CUSTOM_TYPE;
    }),
  }));

  pi.registerMessageRenderer(CUSTOM_TYPE, (message, { expanded }, theme) => {
    const details = message.details as ToolSummaryDetails | undefined;
    const summaryItems = details?.items ?? [];
    if (summaryItems.length === 0) {
      return new Text("", 0, 0);
    }

    let text = "";
    summaryItems.forEach((item, index) => {
      const prefix = index === 0 ? `${theme.fg("success", "•")} ` : "  ";
      const toolColor = item.isError ? "error" : "toolTitle";
      text += `${prefix}${theme.fg(toolColor, theme.bold(item.toolName))} ${theme.fg("muted", item.call)}`;

      if (expanded && item.output) {
        const outputLines = item.output.split("\n");
        for (const line of outputLines) {
          text += `\n    ${theme.fg("toolOutput", line)}`;
        }
      }

      if (index < summaryItems.length - 1) {
        text += "\n";
      }
    });

    return new Text(text, 0, 0);
  });
}
