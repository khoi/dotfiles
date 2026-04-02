import type { AssistantMessage } from "@mariozechner/pi-ai";
import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

type FooterContext = ExtensionContext | ExtensionCommandContext;

type SettingsShape = {
  compaction?: {
    enabled?: boolean;
  };
};

const sanitizeStatusText = (text: string): string => {
  return text.replace(/[\r\n\t]/g, " ").replace(/ +/g, " ").trim();
};

const formatTokens = (count: number): string => {
  if (count < 1_000) return count.toString();
  if (count < 10_000) return `${(count / 1_000).toFixed(1)}k`;
  if (count < 1_000_000) return `${Math.round(count / 1_000)}k`;
  if (count < 10_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  return `${Math.round(count / 1_000_000)}M`;
};

const readCompactionEnabled = (path: string): boolean | undefined => {
  try {
    if (!existsSync(path)) return undefined;
    const parsed = JSON.parse(readFileSync(path, "utf8")) as SettingsShape;
    return parsed.compaction?.enabled;
  } catch {
    return undefined;
  }
};

const getAutoCompactEnabled = (cwd: string): boolean => {
  const globalEnabled = readCompactionEnabled(join(homedir(), ".pi", "agent", "settings.json"));
  const projectEnabled = readCompactionEnabled(join(cwd, ".pi", "settings.json"));
  return projectEnabled ?? globalEnabled ?? true;
};

const setStatusReady = (ctx: FooterContext): void => {
  ctx.ui.setStatus("status-line", "Ready");
};

const installFooter = (pi: ExtensionAPI, ctx: FooterContext): void => {
  const autoCompactEnabled = getAutoCompactEnabled(ctx.cwd);

  ctx.ui.setFooter((tui, _theme, footerData) => {
    const dispose = footerData.onBranchChange(() => tui.requestRender());

    return {
      dispose,
      invalidate() {},
      render(width: number): string[] {
        let totalInput = 0;
        let totalOutput = 0;
        let totalCacheRead = 0;
        let totalCacheWrite = 0;
        let totalCost = 0;

        for (const entry of ctx.sessionManager.getEntries()) {
          if (entry.type !== "message" || entry.message.role !== "assistant") continue;
          const message = entry.message as AssistantMessage;
          totalInput += message.usage.input;
          totalOutput += message.usage.output;
          totalCacheRead += message.usage.cacheRead;
          totalCacheWrite += message.usage.cacheWrite;
          totalCost += message.usage.cost.total;
        }

        const contextUsage = ctx.getContextUsage();
        const contextWindow = contextUsage?.contextWindow ?? ctx.model?.contextWindow ?? 0;
        const contextPercentValue = contextUsage?.percent ?? 0;
        const contextPercent = contextUsage?.percent !== null ? contextPercentValue.toFixed(1) : "?";

        let pwd = ctx.cwd;
        const home = process.env.HOME || process.env.USERPROFILE;
        if (home && pwd.startsWith(home)) {
          pwd = `~${pwd.slice(home.length)}`;
        }

        const branch = footerData.getGitBranch();
        if (branch) {
          pwd = `${pwd} (${branch})`;
        }

        const sessionName = ctx.sessionManager.getSessionName();
        if (sessionName) {
          pwd = `${pwd} • ${sessionName}`;
        }

        const statsParts: string[] = [];
        if (totalInput) statsParts.push(`↑${formatTokens(totalInput)}`);
        if (totalOutput) statsParts.push(`↓${formatTokens(totalOutput)}`);
        if (totalCacheRead) statsParts.push(`R${formatTokens(totalCacheRead)}`);
        if (totalCacheWrite) statsParts.push(`W${formatTokens(totalCacheWrite)}`);

        const usingSubscription = ctx.model ? ctx.modelRegistry.isUsingOAuth(ctx.model) : false;
        if (totalCost || usingSubscription) {
          statsParts.push(`$${totalCost.toFixed(3)}${usingSubscription ? " (sub)" : ""}`);
        }

        const autoIndicator = autoCompactEnabled ? " (auto)" : "";
        const contextPercentDisplay =
          contextPercent === "?"
            ? `?/${formatTokens(contextWindow)}${autoIndicator}`
            : `${contextPercent}%/${formatTokens(contextWindow)}${autoIndicator}`;

        statsParts.push(contextPercentDisplay);

        let statsLeft = statsParts.join(" ");
        let statsLeftWidth = visibleWidth(statsLeft);
        if (statsLeftWidth > width) {
          statsLeft = truncateToWidth(statsLeft, width, "...");
          statsLeftWidth = visibleWidth(statsLeft);
        }

        const modelName = ctx.model?.id || "no-model";
        let rightSideWithoutProvider = modelName;
        if (ctx.model?.reasoning) {
          const thinkingLevel = pi.getThinkingLevel();
          rightSideWithoutProvider =
            thinkingLevel === "off" ? `${modelName} • thinking off` : `${modelName} • ${thinkingLevel}`;
        }

        let rightSide = rightSideWithoutProvider;
        if (footerData.getAvailableProviderCount() > 1 && ctx.model) {
          rightSide = `(${ctx.model.provider}) ${rightSideWithoutProvider}`;
          if (statsLeftWidth + 2 + visibleWidth(rightSide) > width) {
            rightSide = rightSideWithoutProvider;
          }
        }

        const rightSideWidth = visibleWidth(rightSide);
        const totalNeeded = statsLeftWidth + 2 + rightSideWidth;

        let statsLine: string;
        if (totalNeeded <= width) {
          statsLine = statsLeft + " ".repeat(width - statsLeftWidth - rightSideWidth) + rightSide;
        } else {
          const availableForRight = width - statsLeftWidth - 2;
          if (availableForRight > 0) {
            const truncatedRight = truncateToWidth(rightSide, availableForRight, "");
            const truncatedRightWidth = visibleWidth(truncatedRight);
            statsLine =
              statsLeft + " ".repeat(Math.max(0, width - statsLeftWidth - truncatedRightWidth)) + truncatedRight;
          } else {
            statsLine = statsLeft;
          }
        }

        const lines = [
          truncateToWidth(pwd, width, "..."),
          statsLine,
        ];

        const extensionStatuses = footerData.getExtensionStatuses();
        if (extensionStatuses.size > 0) {
          const statusLine = Array.from(extensionStatuses.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([, text]) => sanitizeStatusText(text))
            .join(" ");
          lines.push(truncateToWidth(statusLine, width, "..."));
        }

        return lines;
      },
    };
  });
};

export default function statusLine(pi: ExtensionAPI) {
  let turnCount = 0;

  pi.on("session_start", async (_event, ctx) => {
    installFooter(pi, ctx);
    setStatusReady(ctx);
  });

  pi.on("turn_start", async (_event, ctx) => {
    turnCount += 1;
    ctx.ui.setStatus("status-line", `● Turn ${turnCount}...`);
  });

  pi.on("turn_end", async (_event, ctx) => {
    ctx.ui.setStatus("status-line", `✓ Turn ${turnCount} complete`);
  });

  pi.on("session_switch", async (_event, ctx) => {
    turnCount = 0;
    installFooter(pi, ctx);
    setStatusReady(ctx);
  });
}
