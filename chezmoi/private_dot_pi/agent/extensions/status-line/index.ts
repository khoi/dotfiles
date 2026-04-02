import type { AssistantMessage } from "@mariozechner/pi-ai";
import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import { truncateToWidth } from "@mariozechner/pi-tui";

type FooterContext = ExtensionContext | ExtensionCommandContext;

const sanitizeStatusText = (text: string): string => {
  return text.replace(/[\r\n\t]/g, " ").replace(/ +/g, " ").trim();
};

const formatCost = (cost: number): string => {
  return cost < 0.01 ? cost.toFixed(3) : cost.toFixed(2);
};

const shortenPath = (path: string): string => {
  const home = process.env.HOME || process.env.USERPROFILE;
  const displayPath = home && path.startsWith(home) ? `~${path.slice(home.length)}` : path;
  const parts = displayPath.split("/");

  if (parts.length <= 1) {
    return displayPath;
  }

  return parts
    .map((part, index) => {
      if (index === parts.length - 1 || part === "" || part === "~") {
        return part;
      }

      if (part.startsWith(".") && part.length > 1) {
        return `.${part[1] ?? ""}`;
      }

      return part[0] ?? "";
    })
    .join("/");
};

const installFooter = (pi: ExtensionAPI, ctx: FooterContext): void => {
  ctx.ui.setFooter((tui, theme, footerData) => {
    const dispose = footerData.onBranchChange(() => tui.requestRender());

    return {
      dispose,
      invalidate() {},
      render(width: number): string[] {
        let totalCost = 0;

        for (const entry of ctx.sessionManager.getEntries()) {
          if (entry.type !== "message" || entry.message.role !== "assistant") continue;
          const message = entry.message as AssistantMessage;
          totalCost += message.usage.cost.total;
        }

        const branch = footerData.getGitBranch();
        const basePath = shortenPath(ctx.cwd);
        const pathDisplay = branch ? `${basePath} \u{f02a2} ${branch}` : basePath;

        const fastStatus = footerData.getExtensionStatuses().get("codex-fast");
        const fastSuffix = fastStatus ? ` (${sanitizeStatusText(fastStatus)})` : "";

        const modelId = ctx.model?.id || "no-model";
        const thinkingLevel = ctx.model?.reasoning ? pi.getThinkingLevel() : undefined;
        const thinkingSuffix = thinkingLevel
          ? ` • ${thinkingLevel === "off" ? "thinking off" : thinkingLevel}`
          : "";
        const modelDisplay = `\u{e26d} ${modelId}${fastSuffix}${thinkingSuffix}`;

        const contextUsage = ctx.getContextUsage();
        const contextPercent = contextUsage?.percent ?? null;
        const contextLabel =
          contextPercent === null ? "?" : `${Math.max(0, Math.min(100, Math.round(contextPercent)))}%`;
        const contextDisplay = `\u{f49b} ${contextLabel}`;

        const usingSubscription = ctx.model ? ctx.modelRegistry.isUsingOAuth(ctx.model) : false;
        const costDisplay =
          totalCost || usingSubscription ? `$${formatCost(totalCost)}${usingSubscription ? " (sub)" : ""}` : "";

        const bullet = " • ";
        const components = [modelDisplay, contextDisplay, costDisplay].filter((component) => component.length > 0);
        const line = components.length > 0 ? `${pathDisplay}${bullet}${components.join(bullet)}` : pathDisplay;

        return [truncateToWidth(theme.fg("dim", line), width, theme.fg("dim", "..."))];
      },
    };
  });
};

export default function statusLine(pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.setStatus("status-line", undefined);
    installFooter(pi, ctx);
  });

  pi.on("session_switch", async (_event, ctx) => {
    ctx.ui.setStatus("status-line", undefined);
    installFooter(pi, ctx);
  });
}
