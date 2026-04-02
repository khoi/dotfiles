import { complete, type UserMessage } from "@mariozechner/pi-ai";
import { BorderedLoader, type ExtensionAPI, type ExtensionContext } from "@mariozechner/pi-coding-agent";
import { formatAnswersForUserMessage, normalizeQuestions, runAskPrompt } from "./run-ask.ts";
import type { AskQuestionInput, ExtractedQuestion, ExtractionResult } from "./types.ts";

type ExtractionState =
	| { status: "submitted"; result: ExtractionResult }
	| { status: "cancelled" }
	| { status: "error"; message: string };

const EXTRACTION_PROMPT = `You are a question extractor. Given text from a conversation, extract any questions that need answering.

Output a JSON object with this structure:
{
  "questions": [
    {
      "question": "The question text",
      "context": "Optional context that helps answer the question"
    }
  ]
}

Rules:
- Extract all questions that require user input
- Keep questions in the order they appeared
- Be concise with question text
- Include context only when it provides essential information for answering
- If no questions are found, return {"questions": []}`;

function parseExtractionResult(text: string): ExtractionResult | null {
	const trimmed = text.trim();
	if (!trimmed) {
		return null;
	}

	const candidates = [trimmed];
	const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
	if (codeBlockMatch?.[1]) {
		candidates.unshift(codeBlockMatch[1].trim());
	}

	for (const candidate of candidates) {
		try {
			const parsed = JSON.parse(candidate);
			if (parsed && Array.isArray(parsed.questions)) {
				const questions = parsed.questions
					.map((question: Partial<ExtractedQuestion>) => ({
						question: typeof question.question === "string" ? question.question.trim() : "",
						context: typeof question.context === "string" ? question.context.trim() : undefined,
					}))
					.filter((question: ExtractedQuestion) => question.question.length > 0);
				return { questions };
			}
		} catch {
		}
	}

	return null;
}

function findLastAssistantMessage(ctx: ExtensionContext): { ok: true; text: string } | { ok: false; message: string } {
	const branch = ctx.sessionManager.getBranch();

	for (let index = branch.length - 1; index >= 0; index -= 1) {
		const entry = branch[index];
		if (entry.type !== "message") {
			continue;
		}

		const message = entry.message;
		if (!("role" in message) || message.role !== "assistant") {
			continue;
		}

		if (message.stopReason !== "stop") {
			return { ok: false, message: `Last assistant message incomplete (${message.stopReason})` };
		}

		const text = message.content
			.filter((content): content is { type: "text"; text: string } => content.type === "text")
			.map((content) => content.text)
			.join("\n")
			.trim();

		if (text) {
			return { ok: true, text };
		}
	}

	return { ok: false, message: "No assistant messages found" };
}

async function extractQuestions(ctx: ExtensionContext, sourceText: string): Promise<ExtractionState> {
	return ctx.ui.custom<ExtractionState>((tui, theme, _kb, done) => {
		const loader = new BorderedLoader(tui, theme, `Extracting questions using ${ctx.model!.id}...`);
		loader.onAbort = () => done({ status: "cancelled" });

		const run = async () => {
			const apiKey = await ctx.modelRegistry.getApiKey(ctx.model!);
			if (!apiKey) {
				throw new Error(`No API key for ${ctx.model!.provider}`);
			}

			const userMessage: UserMessage = {
				role: "user",
				content: [{ type: "text", text: sourceText }],
				timestamp: Date.now(),
			};

			const response = await complete(
				ctx.model!,
				{ systemPrompt: EXTRACTION_PROMPT, messages: [userMessage] },
				{ apiKey, signal: loader.signal },
			);

			if (response.stopReason === "aborted") {
				return { status: "cancelled" } as const;
			}

			const responseText = response.content
				.filter((content): content is { type: "text"; text: string } => content.type === "text")
				.map((content) => content.text)
				.join("\n");

			const result = parseExtractionResult(responseText);
			if (!result) {
				throw new Error("Failed to parse extracted questions");
			}

			return { status: "submitted", result } as const;
		};

		run()
			.then(done)
			.catch((error) => done({ status: "error", message: error instanceof Error ? error.message : "Question extraction failed" }));

		return loader;
	});
}

function extractedQuestionsToAskQuestions(questions: ExtractedQuestion[]): AskQuestionInput[] {
	return questions.map((question, index) => ({
		id: `answer-${index + 1}`,
		label: `Q${index + 1}`,
		question: question.question,
		type: "textarea",
		context: question.context,
		required: true,
	}));
}

export function registerAnswerCommand(pi: ExtensionAPI) {
	pi.registerCommand("answer", {
		description: "Extract questions from the last assistant message and answer them in a guided prompt",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("answer requires interactive mode", "error");
				return;
			}

			if (!ctx.isIdle()) {
				ctx.ui.notify("Wait for the current response to finish before using /answer", "warning");
				return;
			}

			if (!ctx.model) {
				ctx.ui.notify("No model selected", "error");
				return;
			}

			const lastAssistantMessage = findLastAssistantMessage(ctx);
			if (!lastAssistantMessage.ok) {
				ctx.ui.notify(lastAssistantMessage.message, "error");
				return;
			}

			const extraction = await extractQuestions(ctx, lastAssistantMessage.text);
			if (extraction.status === "cancelled") {
				ctx.ui.notify("Cancelled", "info");
				return;
			}

			if (extraction.status === "error") {
				ctx.ui.notify(extraction.message, "error");
				return;
			}

			if (extraction.result.questions.length === 0) {
				ctx.ui.notify("No questions found in the last assistant message", "info");
				return;
			}

			const questions = normalizeQuestions(extractedQuestionsToAskQuestions(extraction.result.questions));
			const result = await runAskPrompt(ctx, questions);

			if (result.status === "error") {
				ctx.ui.notify(result.error || "Error", "error");
				return;
			}

			if (result.status === "cancelled") {
				ctx.ui.notify("Cancelled", "info");
				return;
			}

			pi.sendUserMessage(formatAnswersForUserMessage(questions, result.answers));
		},
	});
}
