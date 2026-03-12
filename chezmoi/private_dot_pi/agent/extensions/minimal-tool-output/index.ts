import type { ExtensionAPI, Theme } from "@mariozechner/pi-coding-agent";
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

const toolCache = new Map<string, BuiltInTools>();

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

function renderExpandedResult(result: { content?: Array<{ type: string; text?: string }> }, theme: Theme) {
  const image = result.content?.find((item) => item.type === "image");
  if (image) {
    return new Text(theme.fg("success", "Image loaded"), 0, 0);
  }

  const text = result.content
    ?.filter((item): item is { type: "text"; text: string } => item.type === "text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("\n")
    .trim();

  if (!text) {
    return new Text("", 0, 0);
  }

  const output = text.split("\n").map((line) => theme.fg("toolOutput", line)).join("\n");
  return new Text(`\n${output}`, 0, 0);
}

function registerBuiltInTool(
  pi: ExtensionAPI,
  name: BuiltInToolName,
  renderCall: (args: Record<string, any>, theme: Theme) => Text,
) {
  const tool = getBuiltInTools(process.cwd())[name];

  pi.registerTool({
    name,
    label: tool.label,
    description: tool.description,
    parameters: tool.parameters,

    async execute(toolCallId, params, signal, onUpdate, ctx) {
      return getBuiltInTools(ctx.cwd)[name].execute(toolCallId, params, signal, onUpdate);
    },

    renderCall,

    renderResult(result, { expanded }, theme) {
      if (!expanded) {
        return new Text("", 0, 0);
      }
      return renderExpandedResult(result, theme);
    },
  });
}

export default function minimalToolOutput(pi: ExtensionAPI) {
  registerBuiltInTool(pi, "read", (args, theme) => {
    const path = shortenPath(args.path || "");
    let text = `${theme.fg("toolTitle", theme.bold("read"))} ${theme.fg("accent", path || "...")}`;

    if (args.offset !== undefined || args.limit !== undefined) {
      const start = args.offset ?? 1;
      const end = args.limit !== undefined ? start + args.limit - 1 : "";
      text += theme.fg("warning", `:${start}${end ? `-${end}` : ""}`);
    }

    return new Text(text, 0, 0);
  });

  registerBuiltInTool(pi, "bash", (args, theme) => {
    let text = theme.fg("toolTitle", theme.bold(`$ ${args.command || "..."}`));
    if (typeof args.timeout === "number") {
      text += theme.fg("muted", ` (timeout ${args.timeout}s)`);
    }
    return new Text(text, 0, 0);
  });

  registerBuiltInTool(pi, "write", (args, theme) => {
    const path = shortenPath(args.path || "");
    const lineCount = typeof args.content === "string" ? args.content.split("\n").length : 0;
    let text = `${theme.fg("toolTitle", theme.bold("write"))} ${theme.fg("accent", path || "...")}`;
    if (lineCount > 0) {
      text += theme.fg("muted", ` (${lineCount} lines)`);
    }
    return new Text(text, 0, 0);
  });

  registerBuiltInTool(pi, "edit", (args, theme) => {
    const path = shortenPath(args.path || "");
    return new Text(`${theme.fg("toolTitle", theme.bold("edit"))} ${theme.fg("accent", path || "...")}`, 0, 0);
  });

  registerBuiltInTool(pi, "find", (args, theme) => {
    let text = `${theme.fg("toolTitle", theme.bold("find"))} ${theme.fg("accent", args.pattern || "")}`;
    text += theme.fg("toolOutput", ` in ${shortenPath(args.path || ".")}`);
    if (args.limit !== undefined) {
      text += theme.fg("toolOutput", ` (limit ${args.limit})`);
    }
    return new Text(text, 0, 0);
  });

  registerBuiltInTool(pi, "grep", (args, theme) => {
    let text = `${theme.fg("toolTitle", theme.bold("grep"))} ${theme.fg("accent", `/${args.pattern || ""}/`)}`;
    text += theme.fg("toolOutput", ` in ${shortenPath(args.path || ".")}`);
    if (args.glob) {
      text += theme.fg("toolOutput", ` (${args.glob})`);
    }
    if (args.limit !== undefined) {
      text += theme.fg("toolOutput", ` limit ${args.limit}`);
    }
    return new Text(text, 0, 0);
  });

  registerBuiltInTool(pi, "ls", (args, theme) => {
    let text = `${theme.fg("toolTitle", theme.bold("ls"))} ${theme.fg("accent", shortenPath(args.path || "."))}`;
    if (args.limit !== undefined) {
      text += theme.fg("toolOutput", ` (limit ${args.limit})`);
    }
    return new Text(text, 0, 0);
  });
}
