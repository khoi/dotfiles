import { complete } from "@mariozechner/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

type ContentBlock = {
  type?: string;
  text?: string;
  name?: string;
};

type SessionEntry = {
  type: string;
  message?: {
    role?: string;
    content?: unknown;
  };
  summary?: string;
};

const DEBOUNCE_SECONDS = 60;
const MAX_TOKENS = 300;
const RESUMMARIZE_TOKEN_THRESHOLD = 40_000;

const AUTO_DETECT_MODELS = [
  "gpt-5.3-codex-spark",
  "gpt-5.4-nano",
  "gpt-5.4-mini",
  "gemini-3-flash",
  "claude-4-5-haiku",
] as const;

const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

const renderContent = (content: unknown): string => {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  const parts: string[] = [];
  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    const value = block as ContentBlock;
    if (value.type === "text" && typeof value.text === "string") {
      parts.push(value.text);
      continue;
    }
    if (value.type === "toolCall" && typeof value.name === "string") {
      parts.push(`[tool call: ${value.name}]`);
    }
  }

  return parts.join("\n");
};

const buildConversation = (entries: SessionEntry[]): string => {
  const lines: string[] = [];

  for (const entry of entries) {
    if (entry.type === "compaction" && typeof entry.summary === "string" && entry.summary.trim()) {
      lines.push(`[compaction summary: ${entry.summary.trim()}]`);
      continue;
    }

    if (entry.type !== "message" || !entry.message?.role) continue;

    const role = entry.message.role;
    const text = renderContent(entry.message.content).trim();

    if (role === "user" && text) {
      lines.push(`User: ${text}`);
      continue;
    }

    if (role === "assistant" && text) {
      lines.push(`Assistant: ${text}`);
      continue;
    }

    if (role === "toolResult") {
      const bytes = new TextEncoder().encode(text).length;
      lines.push(`[tool result: ${bytes} bytes]`);
      continue;
    }

    if (role === "compactionSummary" && text) {
      lines.push(`[compaction summary: ${text}]`);
    }
  }

  return lines.join("\n");
};

const resolveSummaryModel = (ctx: ExtensionContext) => {
  const available = ctx.modelRegistry.getAvailable();
  for (const candidateId of AUTO_DETECT_MODELS) {
    const match = available.find((model) => model.id === candidateId);
    if (match) return match;
  }
  return ctx.model;
};

const getModelAuth = async (ctx: ExtensionContext, model: NonNullable<ExtensionContext["model"]>) => {
  const registry = ctx.modelRegistry as ExtensionContext["modelRegistry"] & {
    getApiKeyAndHeaders?: (
      candidate: NonNullable<ExtensionContext["model"]>,
    ) => Promise<{ ok?: boolean; apiKey?: string; headers?: Record<string, string> } | undefined>;
    getApiKey?: (candidate: NonNullable<ExtensionContext["model"]>) => Promise<string | undefined>;
  };

  if (typeof registry.getApiKeyAndHeaders === "function") {
    const auth = await registry.getApiKeyAndHeaders(model);
    if (auth?.ok && auth.apiKey) return auth;
  }

  if (typeof registry.getApiKey === "function") {
    const apiKey = await registry.getApiKey(model);
    if (apiKey) return { apiKey };
  }

  return undefined;
};

export default function thinkingSummary(pi: ExtensionAPI) {
  let lastSummary = "";
  let lastSummaryConvTokens = 0;
  let lastSummaryTime = 0;
  let pending = false;

  const restoreState = (ctx: ExtensionContext) => {
    lastSummary = pi.getSessionName() || "";
    const conversation = buildConversation(ctx.sessionManager.getBranch());
    lastSummaryConvTokens = lastSummary ? estimateTokens(conversation) : 0;
    lastSummaryTime = 0;
    pending = false;
  };

  const generateSummary = async (ctx: ExtensionContext) => {
    if (pending) return;

    const model = resolveSummaryModel(ctx);
    if (!model) return;

    const auth = await getModelAuth(ctx, model);
    if (!auth?.apiKey) return;

    const conversation = buildConversation(ctx.sessionManager.getBranch());
    if (!conversation.trim()) return;

    const convTokens = estimateTokens(conversation);
    const shouldResummarize = !lastSummary || convTokens - lastSummaryConvTokens >= RESUMMARIZE_TOKEN_THRESHOLD;

    const prompt = shouldResummarize
      ? [
          "Summarize this coding session in a SINGLE SHOT line (max ~80 chars).",
          "Highlight: headline of the current problem the user is working on (taking into account current progress, and immediate next step if outlined).",
          "Be maximally specific and concrete.",
          "",
          "<conversation>",
          conversation,
          "</conversation>",
        ].join("\n")
      : [
          "Here is the previous one-line summary of this coding session:",
          `<summary>${lastSummary}</summary>`,
          "",
          "Here is the conversation since that summary was generated:",
          "<conversation>",
          conversation,
          "</conversation>",
          "",
          "Update the summary ONLY if the conversation means a major update - default should be to repeat it verbatim.",
          "If nothing material changed, return the previous summary exactly.",
          "Summarize this coding session (not just progress from last time!) in a SINGLE SHOT line (max ~80 chars).",
          "Highlight: headline of the current problem the user is working on - in the whole session, not just the <conversation> increment (taking into account current progress, and immediate next step if outlined).",
          "Be maximally specific and concrete.",
        ].join("\n");

    pending = true;

    void complete(
      model,
      {
        systemPrompt: "You are a concise summarizer. Output a single line summary of a coding session.",
        messages: [
          {
            role: "user" as const,
            content: [{ type: "text" as const, text: prompt }],
            timestamp: Date.now(),
          },
        ],
      },
      {
        apiKey: auth.apiKey,
        headers: auth.headers,
        maxTokens: MAX_TOKENS,
        sessionId: ctx.sessionManager.getSessionId(),
      } as any,
    )
      .then((response) => {
        if (response.stopReason === "error") return;

        const text = response.content
          .filter((content): content is { type: "text"; text: string } => content.type === "text")
          .map((content) => content.text)
          .join(" ")
          .trim()
          .replace(/\n+/g, " ");

        if (!text) return;

        lastSummary = text;
        lastSummaryConvTokens = convTokens;
        lastSummaryTime = Date.now();
        pi.setSessionName(text);
      })
      .catch(() => {})
      .finally(() => {
        pending = false;
      });
  };

  pi.on("session_start", async (_event, ctx) => {
    restoreState(ctx);
  });

  pi.on("session_switch", async (_event, ctx) => {
    restoreState(ctx);
  });

  pi.on("agent_end", async (_event, ctx) => {
    if (Date.now() - lastSummaryTime < DEBOUNCE_SECONDS * 1000 && lastSummary) return;
    await generateSummary(ctx);
  });
}
