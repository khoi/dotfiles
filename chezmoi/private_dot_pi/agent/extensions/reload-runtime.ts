import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";

export default function reloadRuntime(pi: ExtensionAPI) {
	pi.registerCommand("reload-runtime", {
		description: "Reload pi runtime resources",
		handler: async (_args, ctx) => {
			await ctx.reload();
			return;
		},
	});

	pi.registerTool({
		name: "reload_runtime",
		label: "Reload Runtime",
		description: "Reload pi runtime resources",
		promptSnippet: "Reload pi runtime resources when the user explicitly asks for /reload.",
		promptGuidelines: ["Use this tool only when the user explicitly asks to reload pi runtime resources."],
		parameters: Type.Object({}),
		async execute() {
			pi.sendUserMessage("/reload-runtime", { deliverAs: "followUp" });
			return {
				content: [{ type: "text", text: "Queued /reload-runtime as a follow-up command." }],
				details: {},
			};
		},
	});
}
