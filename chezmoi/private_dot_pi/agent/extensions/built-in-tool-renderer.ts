import type { EditToolDetails, ExtensionAPI, ReadToolDetails } from "@mariozechner/pi-coding-agent";
import { createEditTool, createReadTool, createWriteTool } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";

const promptMetadata = {
  read: {
    promptSnippet: "Read file contents",
    promptGuidelines: ["Use read to examine files instead of cat or sed."],
  },
  edit: {
    promptSnippet: "Make surgical edits to files (find exact text and replace)",
    promptGuidelines: ["Use edit for precise changes (old text must match exactly)."],
  },
  write: {
    promptSnippet: "Create or overwrite files",
    promptGuidelines: ["Use write only for new files or complete rewrites."],
  },
} as const;

const getTextContent = (result: { content: Array<{ type: string; text?: string }> }): string | undefined => {
  const content = result.content[0];
  return content?.type === "text" ? content.text : undefined;
};

const countDiffLines = (diff: string): { additions: number; removals: number } => {
  let additions = 0;
  let removals = 0;

  for (const line of diff.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) additions += 1;
    if (line.startsWith("-") && !line.startsWith("---")) removals += 1;
  }

  return { additions, removals };
};

export default function builtInToolRenderer(pi: ExtensionAPI) {
  const cwd = process.cwd();

  const read = createReadTool(cwd);
  pi.registerTool({
    name: "read",
    label: read.label,
    description: read.description,
    parameters: read.parameters,
    ...promptMetadata.read,
    async execute(toolCallId, params, signal, onUpdate) {
      return read.execute(toolCallId, params, signal, onUpdate);
    },
    renderCall(args, theme) {
      let text = theme.fg("toolTitle", theme.bold("read ")) + theme.fg("accent", args.path);
      if (args.offset || args.limit) {
        const parts: string[] = [];
        if (args.offset) parts.push(`offset=${args.offset}`);
        if (args.limit) parts.push(`limit=${args.limit}`);
        text += theme.fg("dim", ` (${parts.join(", ")})`);
      }
      return new Text(text, 0, 0);
    },
    renderResult(result, { expanded, isPartial }, theme, context) {
      if (isPartial) return new Text(theme.fg("warning", "Reading..."), 0, 0);

      const content = result.content[0];
      const details = result.details as ReadToolDetails | undefined;
      if (content?.type === "image") {
        let text = theme.fg("accent", context.args.path) + theme.fg("dim", " (image)");
        if (details?.truncation?.truncated) {
          text += theme.fg("warning", ` (truncated from ${details.truncation.totalLines} lines)`);
        }
        return new Text(text, 0, 0);
      }

      const output = getTextContent(result);
      if (output === undefined) return new Text(theme.fg("error", "No content"), 0, 0);

      const lines = output.split("\n");
      if (!expanded) {
        let text = theme.fg("accent", context.args.path);
        if (details?.truncation?.truncated) {
          text += theme.fg("warning", ` (truncated from ${details.truncation.totalLines} lines)`);
        }
        return new Text(text, 0, 0);
      }

      let text = theme.fg("success", `${lines.length} lines`);
      if (details?.truncation?.truncated) {
        text += theme.fg("warning", ` (truncated from ${details.truncation.totalLines})`);
      }

      for (const line of lines.slice(0, 15)) {
        text += `\n${theme.fg("dim", line)}`;
      }
      if (lines.length > 15) {
        text += `\n${theme.fg("muted", `... ${lines.length - 15} more lines`)}`;
      }

      return new Text(text, 0, 0);
    },
  });

  const edit = createEditTool(cwd);
  pi.registerTool({
    name: "edit",
    label: edit.label,
    description: edit.description,
    parameters: edit.parameters,
    ...promptMetadata.edit,
    async execute(toolCallId, params, signal, onUpdate) {
      return edit.execute(toolCallId, params, signal, onUpdate);
    },
    renderCall(args, theme) {
      return new Text(
        theme.fg("toolTitle", theme.bold("edit ")) + theme.fg("accent", args.path),
        0,
        0,
      );
    },
    renderResult(result, { expanded, isPartial }, theme) {
      if (isPartial) return new Text(theme.fg("warning", "Editing..."), 0, 0);

      const output = getTextContent(result);
      if (output?.startsWith("Error")) {
        return new Text(theme.fg("error", output.split("\n")[0] ?? output), 0, 0);
      }

      const details = result.details as EditToolDetails | undefined;
      if (!details?.diff) return new Text(theme.fg("success", "Applied"), 0, 0);

      const diffLines = details.diff.split("\n");
      const { additions, removals } = countDiffLines(details.diff);
      let text = theme.fg("success", `+${additions}`) + theme.fg("dim", " / ") + theme.fg("error", `-${removals}`);

      if (expanded) {
        for (const line of diffLines.slice(0, 30)) {
          if (line.startsWith("+") && !line.startsWith("+++")) {
            text += `\n${theme.fg("success", line)}`;
          } else if (line.startsWith("-") && !line.startsWith("---")) {
            text += `\n${theme.fg("error", line)}`;
          } else {
            text += `\n${theme.fg("dim", line)}`;
          }
        }
        if (diffLines.length > 30) {
          text += `\n${theme.fg("muted", `... ${diffLines.length - 30} more diff lines`)}`;
        }
      }

      return new Text(text, 0, 0);
    },
  });

  const write = createWriteTool(cwd);
  pi.registerTool({
    name: "write",
    label: write.label,
    description: write.description,
    parameters: write.parameters,
    ...promptMetadata.write,
    async execute(toolCallId, params, signal, onUpdate) {
      return write.execute(toolCallId, params, signal, onUpdate);
    },
    renderCall(args, theme) {
      const lineCount = args.content.split("\n").length;
      const text =
        theme.fg("toolTitle", theme.bold("write ")) +
        theme.fg("accent", args.path) +
        theme.fg("dim", ` (${lineCount} lines)`);
      return new Text(text, 0, 0);
    },
    renderResult(result, { isPartial }, theme) {
      if (isPartial) return new Text(theme.fg("warning", "Writing..."), 0, 0);

      const output = getTextContent(result);
      if (output?.startsWith("Error")) {
        return new Text(theme.fg("error", output.split("\n")[0] ?? output), 0, 0);
      }

      return new Text(theme.fg("success", "Written"), 0, 0);
    },
  });
}
