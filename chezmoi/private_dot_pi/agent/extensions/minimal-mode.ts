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

const shortenPath = (path: string): string => {
	const home = homedir();
	if (path.startsWith(home)) return `~${path.slice(home.length)}`;
	return path;
};

const createBuiltInTools = (cwd: string) => ({
	read: createReadTool(cwd),
	bash: createBashTool(cwd),
	edit: createEditTool(cwd),
	write: createWriteTool(cwd),
	find: createFindTool(cwd),
	grep: createGrepTool(cwd),
	ls: createLsTool(cwd),
});

const toolCache = new Map<string, ReturnType<typeof createBuiltInTools>>();

const getBuiltInTools = (cwd: string) => {
	let tools = toolCache.get(cwd);
	if (!tools) {
		tools = createBuiltInTools(cwd);
		toolCache.set(cwd, tools);
	}
	return tools;
};

const getTextContent = (result: { content: Array<{ type: string; text?: string }> }): string => {
	const textContent = result.content.find((content) => content.type === "text");
	return textContent?.type === "text" && textContent.text ? textContent.text : "";
};

const renderExpandedOutput = (
	result: { content: Array<{ type: string; text?: string }> },
	theme: { fg: (color: string, text: string) => string },
	options?: { trim?: boolean; color?: string },
) => {
	const text = getTextContent(result);
	const normalized = options?.trim ? text.trim() : text;
	if (!normalized) return new Text("", 0, 0);
	const color = options?.color ?? "toolOutput";
	const output = normalized
		.split("\n")
		.map((line) => theme.fg(color, line))
		.join("\n");
	return new Text(`\n${output}`, 0, 0);
};

const renderCount = (
	result: { content: Array<{ type: string; text?: string }> },
	theme: { fg: (color: string, text: string) => string },
	label: string,
) => {
	const count = getTextContent(result)
		.trim()
		.split("\n")
		.filter(Boolean).length;
	return count > 0 ? new Text(theme.fg("muted", ` → ${count} ${label}`), 0, 0) : new Text("", 0, 0);
};

export default function minimalMode(pi: ExtensionAPI) {
	pi.registerTool({
		name: "read",
		label: "read",
		description:
			"Read the contents of a file. Supports text files and images (jpg, png, gif, webp). Images are sent as attachments. For text files, output is truncated to 2000 lines or 50KB (whichever is hit first). Use offset/limit for large files.",
		parameters: getBuiltInTools(process.cwd()).read.parameters,
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			return getBuiltInTools(ctx.cwd).read.execute(toolCallId, params, signal, onUpdate);
		},
		renderCall(args, theme) {
			const path = shortenPath(args.path || "");
			let pathDisplay = path ? theme.fg("accent", path) : theme.fg("toolOutput", "...");
			if (args.offset !== undefined || args.limit !== undefined) {
				const startLine = args.offset ?? 1;
				const endLine = args.limit !== undefined ? startLine + args.limit - 1 : "";
				pathDisplay += theme.fg("warning", `:${startLine}${endLine ? `-${endLine}` : ""}`);
			}
			return new Text(`${theme.fg("toolTitle", theme.bold("read"))} ${pathDisplay}`, 0, 0);
		},
		renderResult(result, { expanded }, theme) {
			if (!expanded) return new Text("", 0, 0);
			return renderExpandedOutput(result, theme);
		},
	});

	pi.registerTool({
		name: "bash",
		label: "bash",
		description:
			"Execute a bash command in the current working directory. Returns stdout and stderr. Output is truncated to last 2000 lines or 50KB (whichever is hit first).",
		parameters: getBuiltInTools(process.cwd()).bash.parameters,
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			return getBuiltInTools(ctx.cwd).bash.execute(toolCallId, params, signal, onUpdate);
		},
		renderCall(args, theme) {
			const command = args.command || "...";
			const timeoutSuffix = args.timeout ? theme.fg("muted", ` (timeout ${args.timeout}s)`) : "";
			return new Text(theme.fg("toolTitle", theme.bold(`$ ${command}`)) + timeoutSuffix, 0, 0);
		},
		renderResult(result, { expanded }, theme) {
			if (!expanded) return new Text("", 0, 0);
			return renderExpandedOutput(result, theme, { trim: true });
		},
	});

	pi.registerTool({
		name: "write",
		label: "write",
		description:
			"Write content to a file. Creates the file if it doesn't exist, overwrites if it does. Automatically creates parent directories.",
		parameters: getBuiltInTools(process.cwd()).write.parameters,
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			return getBuiltInTools(ctx.cwd).write.execute(toolCallId, params, signal, onUpdate);
		},
		renderCall(args, theme) {
			const path = shortenPath(args.path || "");
			const lineCount = args.content ? args.content.split("\n").length : 0;
			const lineInfo = lineCount > 0 ? theme.fg("muted", ` (${lineCount} lines)`) : "";
			const pathDisplay = path ? theme.fg("accent", path) : theme.fg("toolOutput", "...");
			return new Text(`${theme.fg("toolTitle", theme.bold("write"))} ${pathDisplay}${lineInfo}`, 0, 0);
		},
		renderResult(result, { expanded }, theme) {
			if (!expanded || !result.isError) return new Text("", 0, 0);
			const text = getTextContent(result);
			if (!text) return new Text("", 0, 0);
			return renderExpandedOutput(result, theme, { color: "error" });
		},
	});

	pi.registerTool({
		name: "edit",
		label: "edit",
		description:
			"Edit a file by replacing exact text. The oldText must match exactly (including whitespace). Use this for precise, surgical edits.",
		parameters: getBuiltInTools(process.cwd()).edit.parameters,
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			return getBuiltInTools(ctx.cwd).edit.execute(toolCallId, params, signal, onUpdate);
		},
		renderCall(args, theme) {
			const path = shortenPath(args.path || "");
			const pathDisplay = path ? theme.fg("accent", path) : theme.fg("toolOutput", "...");
			return new Text(`${theme.fg("toolTitle", theme.bold("edit"))} ${pathDisplay}`, 0, 0);
		},
		renderResult(result, { expanded }, theme) {
			if (!expanded) return new Text("", 0, 0);
			const text = getTextContent(result);
			if (!text) return new Text("", 0, 0);
			return renderExpandedOutput(result, theme, { color: result.isError ? "error" : "toolOutput" });
		},
	});

	pi.registerTool({
		name: "find",
		label: "find",
		description:
			"Find files by name pattern (glob). Searches recursively from the specified path. Output limited to 200 results.",
		parameters: getBuiltInTools(process.cwd()).find.parameters,
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			return getBuiltInTools(ctx.cwd).find.execute(toolCallId, params, signal, onUpdate);
		},
		renderCall(args, theme) {
			const pattern = args.pattern || "";
			const path = shortenPath(args.path || ".");
			let text = `${theme.fg("toolTitle", theme.bold("find"))} ${theme.fg("accent", pattern)}`;
			text += theme.fg("toolOutput", ` in ${path}`);
			if (args.limit !== undefined) text += theme.fg("toolOutput", ` (limit ${args.limit})`);
			return new Text(text, 0, 0);
		},
		renderResult(result, { expanded }, theme) {
			if (!expanded) return renderCount(result, theme, "files");
			return renderExpandedOutput(result, theme, { trim: true });
		},
	});

	pi.registerTool({
		name: "grep",
		label: "grep",
		description:
			"Search file contents by regex pattern. Uses ripgrep for fast searching. Output limited to 200 matches.",
		parameters: getBuiltInTools(process.cwd()).grep.parameters,
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			return getBuiltInTools(ctx.cwd).grep.execute(toolCallId, params, signal, onUpdate);
		},
		renderCall(args, theme) {
			const pattern = args.pattern || "";
			const path = shortenPath(args.path || ".");
			let text = `${theme.fg("toolTitle", theme.bold("grep"))} ${theme.fg("accent", `/${pattern}/`)}`;
			text += theme.fg("toolOutput", ` in ${path}`);
			if (args.glob) text += theme.fg("toolOutput", ` (${args.glob})`);
			if (args.limit !== undefined) text += theme.fg("toolOutput", ` limit ${args.limit}`);
			return new Text(text, 0, 0);
		},
		renderResult(result, { expanded }, theme) {
			if (!expanded) return renderCount(result, theme, "matches");
			return renderExpandedOutput(result, theme, { trim: true });
		},
	});

	pi.registerTool({
		name: "ls",
		label: "ls",
		description:
			"List directory contents with file sizes. Shows files and directories with their sizes. Output limited to 500 entries.",
		parameters: getBuiltInTools(process.cwd()).ls.parameters,
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			return getBuiltInTools(ctx.cwd).ls.execute(toolCallId, params, signal, onUpdate);
		},
		renderCall(args, theme) {
			const path = shortenPath(args.path || ".");
			let text = `${theme.fg("toolTitle", theme.bold("ls"))} ${theme.fg("accent", path)}`;
			if (args.limit !== undefined) text += theme.fg("toolOutput", ` (limit ${args.limit})`);
			return new Text(text, 0, 0);
		},
		renderResult(result, { expanded }, theme) {
			if (!expanded) return renderCount(result, theme, "entries");
			return renderExpandedOutput(result, theme, { trim: true });
		},
	});
}
