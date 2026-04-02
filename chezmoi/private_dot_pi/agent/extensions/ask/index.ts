import { StringEnum } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { registerAnswerCommand } from "./answer.ts";
import { errorResult, formatToolResult, normalizeQuestions, renderAskCall, renderAskResult, runAskPrompt } from "./run-ask.ts";
import type { AskQuestionInput, AskResult } from "./types.ts";

const QuestionTypeSchema = StringEnum(["select", "text", "textarea"] as const);

const AskOptionSchema = Type.Object({
	value: Type.Optional(Type.String({ description: "Value returned for this option. Defaults to label when omitted." })),
	label: Type.String({ description: "Label shown to the user" }),
	description: Type.Optional(Type.String({ description: "Optional extra detail shown below the label" })),
});

const AskQuestionSchema = Type.Object({
	id: Type.String({ description: "Stable identifier for this question" }),
	label: Type.Optional(Type.String({ description: "Short label for tabs and summaries. Defaults to Q1, Q2, ..." })),
	question: Type.String({ description: "Question shown to the user" }),
	type: Type.Optional(QuestionTypeSchema),
	context: Type.Optional(Type.String({ description: "Optional supporting context shown under the question" })),
	options: Type.Optional(Type.Array(AskOptionSchema, { description: "Choices for select questions" })),
	multi: Type.Optional(Type.Boolean({ description: "Allow selecting multiple options for select questions" })),
	recommended: Type.Optional(Type.Integer({ description: "Recommended option index for select questions (0-based)" })),
	allowOther: Type.Optional(Type.Boolean({ description: "Add an Other option that lets the user type a custom answer for select questions. Defaults to true." })),
	required: Type.Optional(Type.Boolean({ description: "Require an answer before submit. Defaults to true." })),
	placeholder: Type.Optional(Type.String({ description: "Optional hint shown above text and textarea editors" })),
});

const AskParamsSchema = Type.Object({
	questions: Type.Array(AskQuestionSchema, {
		description: "Questions to ask. Prefer a single ask call with all related questions.",
	}),
});

export default function ask(pi: ExtensionAPI) {
	pi.registerTool({
		name: "ask",
		label: "Ask",
		description:
			"Ask the user one or more structured questions with select, multi-select, text, or textarea answers. Use this for clarifying requirements, preferences, and constraints.",
		promptSnippet: "Ask the user structured follow-up questions with select, multi-select, text, or textarea answers.",
		promptGuidelines: [
			"Use this tool when a tight multiple-choice or short free-text clarification would unblock work.",
			"Prefer one ask call with multiple related questions instead of chaining several separate clarifications.",
			"Do not include your own Other option for select questions unless you explicitly disable the built-in one.",
		],
		parameters: AskParamsSchema,
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			if (!ctx.hasUI) {
				return errorResult("Error: UI not available (running in non-interactive mode)");
			}
			if (params.questions.length === 0) {
				return errorResult("Error: No questions provided");
			}

			let questions;
			try {
				questions = normalizeQuestions(params.questions as AskQuestionInput[]);
			} catch (error) {
				return errorResult(error instanceof Error ? error.message : "Error: Invalid ask payload");
			}

			const result = await runAskPrompt(ctx, questions);
			return formatToolResult(result);
		},
		renderCall(args, theme) {
			return renderAskCall(args as { questions?: AskQuestionInput[] }, theme);
		},
		renderResult(result, _options, theme) {
			return renderAskResult(result as { content: { type: "text"; text: string }[]; details?: AskResult }, theme);
		},
	});

	registerAnswerCommand(pi);
}
