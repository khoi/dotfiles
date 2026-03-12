import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { AssistantMessageComponent } from "@mariozechner/pi-coding-agent";

const ORIGINAL_UPDATE_CONTENT = Symbol.for("khoi.thinking-summary.original-update-content");

type AssistantMessageLike = {
  content: Array<{
    type: string;
    thinking?: string;
  }>;
};

function truncateSummary(text: string, maxLength = 160): string {
  const normalized = text.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function getCollapsedThinkingSummary(thinking: string): string {
  const seen = new Set<string>();
  const headings = thinking
    .trim()
    .split(/\n\s*\n+/)
    .map((section) =>
      section
        .split("\n")
        .map((line) => line.trim())
        .find(Boolean),
    )
    .filter((heading): heading is string => Boolean(heading))
    .filter((heading) => {
      if (seen.has(heading)) return false;
      seen.add(heading);
      return true;
    });

  if (headings.length === 0) {
    return "Thinking...";
  }

  return truncateSummary(headings[0]);
}

function summarizeMessage(message: AssistantMessageLike): AssistantMessageLike {
  return {
    ...message,
    content: message.content.map((content) => {
      if (content.type !== "thinking" || typeof content.thinking !== "string" || !content.thinking.trim()) {
        return content;
      }

      return {
        ...content,
        thinking: getCollapsedThinkingSummary(content.thinking),
      };
    }),
  };
}

export default async function thinkingSummary(_pi: ExtensionAPI) {
  const proto = AssistantMessageComponent.prototype as any;
  const originalUpdateContent = proto[ORIGINAL_UPDATE_CONTENT] ?? proto.updateContent;

  proto[ORIGINAL_UPDATE_CONTENT] = originalUpdateContent;
  proto.updateContent = function (message: AssistantMessageLike) {
    if (!this.hideThinkingBlock) {
      return originalUpdateContent.call(this, message);
    }

    const hasThinking = message.content.some(
      (content) => content.type === "thinking" && typeof content.thinking === "string" && content.thinking.trim(),
    );

    if (!hasThinking) {
      return originalUpdateContent.call(this, message);
    }

    const summarizedMessage = summarizeMessage(message);
    const previousHideThinkingBlock = this.hideThinkingBlock;

    this.hideThinkingBlock = false;

    try {
      return originalUpdateContent.call(this, summarizedMessage);
    } finally {
      this.hideThinkingBlock = previousHideThinkingBlock;
      this.lastMessage = message;
    }
  };
}
