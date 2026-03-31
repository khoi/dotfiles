/**
 * Pi Notify Extension
 *
 * Sends a native terminal notification when Pi agent is done and waiting for input.
 * Uses OSC 777 escape sequence supported by Ghostty, iTerm2, and other modern terminals.
 *
 * Click the notification to focus the terminal tab/window.
 */

import { spawn } from "node:child_process";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { AssistantMessage, TextContent } from "@mariozechner/pi-ai";

const supatermCLIPath = process.env.SUPATERM_CLI_PATH;
const supatermSurfaceID = process.env.SUPATERM_SURFACE_ID;
const supatermSessionID = supatermSurfaceID
  ? `pi-notify-supaterm-${supatermSurfaceID.toLowerCase()}`
  : undefined;

type SupatermClaudeHookEventName =
  | "Notification"
  | "PreToolUse"
  | "SessionEnd"
  | "SessionStart"
  | "Stop";

type SupatermClaudeHookEvent = {
  hook_event_name: SupatermClaudeHookEventName;
  agent_type?: string;
  cwd: string;
  last_assistant_message?: string;
  message?: string;
  model?: string;
  notification_type?: string;
  permission_mode?: string;
  reason?: string;
  session_id?: string;
  source: string;
  title?: string;
};

function isSupatermPane(): boolean {
  return Boolean(supatermCLIPath && supatermSessionID);
}

async function sendSupatermClaudeHook(event: SupatermClaudeHookEvent): Promise<void> {
  if (!supatermCLIPath || !supatermSessionID) {
    return;
  }

  await new Promise<void>((resolve) => {
    const child = spawn(supatermCLIPath, ["agent-hook", "--agent", "claude"], {
      env: process.env,
      stdio: ["pipe", "ignore", "ignore"],
    });

    const finish = () => resolve();

    child.on("error", finish);
    child.on("close", finish);
    child.stdin?.on("error", finish);
    child.stdin?.end(
      JSON.stringify({
        ...event,
        session_id: supatermSessionID,
      })
    );
  });
}

function supatermClaudeHookEvent(
  hookEventName: SupatermClaudeHookEventName,
  extra: Omit<SupatermClaudeHookEvent, "cwd" | "hook_event_name" | "session_id" | "source"> = {}
): SupatermClaudeHookEvent {
  return {
    ...extra,
    cwd: process.cwd(),
    hook_event_name: hookEventName,
    session_id: supatermSessionID,
    source: "pi-notify-supaterm",
  };
}

function notify(title: string, body: string): void {
  const sTitle = title.replace(/;/g, ":").replace(/\n/g, " ").trim();
  const sBody = body.replace(/;/g, ":").replace(/\n/g, " ").trim();
  process.stdout.write(`\x1b]777;notify;${sTitle};${sBody}\x07`);
}

function formatDuration(ms: number): string | null {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return null;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h${remainingMinutes > 0 ? `${remainingMinutes}m` : ""}`;
}

function cleanModelName(name: string): string {
  return name
    .replace(/\s*\(.*?\)/g, "")
    .replace(/High|Medium|Low/g, (m) => m[0])
    .trim();
}

export default function (pi: ExtensionAPI) {
  let startTime = 0;
  let toolCalls = 0;
  let hasError = false;
  let errorTool: string | undefined;
  let lastAction: string | undefined;

  pi.on("agent_start", async (_event, ctx) => {
    startTime = Date.now();
    toolCalls = 0;
    hasError = false;
    errorTool = undefined;
    lastAction = undefined;

    if (isSupatermPane()) {
      await sendSupatermClaudeHook(
        supatermClaudeHookEvent("SessionStart", {
          agent_type: "assistant",
          model: ctx.model?.name ?? "Pi",
          title: "Pi",
        })
      );
      await sendSupatermClaudeHook(
        supatermClaudeHookEvent("PreToolUse", {
          permission_mode: "acceptEdits",
        })
      );
    }
  });

  pi.on("tool_call", async (event) => {
    toolCalls++;

    if (event.toolName === "bash" && typeof event.input.command === "string") {
      lastAction = `💻 ${event.input.command.split("\n")[0]}`;
    } else if ((event.toolName === "write" || event.toolName === "edit") && typeof event.input.path === "string") {
      lastAction = `📝 ${event.input.path.split("/").pop()}`;
    }
  });

  pi.on("tool_result", async (event) => {
    if (event.isError) {
      hasError = true;
      errorTool = event.toolName;
    }
  });

  pi.on("agent_end", async (event, ctx) => {
    const durationStr = formatDuration(Date.now() - startTime);
    const modelName = ctx.model?.name ?? "Pi";
    const sessionName = pi.getSessionName();

    const lastAssistantMessage = [...event.messages]
      .reverse()
      .find((m): m is AssistantMessage => m.role === "assistant");

    let snippet = "Ready for input";
    let isTruncated = false;

    if (lastAssistantMessage) {
      const text = lastAssistantMessage.content
        .filter((c): c is TextContent => c.type === "text")
        .map((c) => c.text)
        .join(" ");

      if (text.length > 0) {
        snippet = text.length > 120 ? text.substring(0, 117) + "..." : text;
      }

      if (lastAssistantMessage.stopReason === "length") {
        isTruncated = true;
      }
    }

    let status = hasError ? "❌ " : "✅ ";
    if (isTruncated && !hasError) {
      status = "⚠️ ";
    }

    const titlePrefix = durationStr ? `(${durationStr}) ` : "";
    const title = `${status}${titlePrefix}Pi: ${cleanModelName(modelName)}`;

    const meta: string[] = [];

    if (lastAction) {
      const displayAction = lastAction.length > 30 ? lastAction.substring(0, 29) + "…" : lastAction;
      meta.push(displayAction);
    }

    if (toolCalls > 0) meta.push(`${toolCalls} ops`);
    if (hasError && errorTool) meta.push(`${errorTool} ❌`);
    if (isTruncated) meta.push("trunc ⚠️");
    if (sessionName) meta.push(sessionName);

    const body = meta.length > 0 ? `[${meta.join(" · ")}] ${snippet}` : snippet;

    if (isSupatermPane()) {
      await sendSupatermClaudeHook(
        supatermClaudeHookEvent("Notification", {
          message: body,
          notification_type: hasError ? "error" : "request_input",
          title,
        })
      );
      await sendSupatermClaudeHook(
        supatermClaudeHookEvent("Stop", {
          last_assistant_message: snippet,
        })
      );
      return;
    }

    notify(title, body);
  });

  pi.on("session_shutdown", async () => {
    if (isSupatermPane()) {
      await sendSupatermClaudeHook(
        supatermClaudeHookEvent("SessionEnd", {
          reason: "exit",
          title: "Pi",
        })
      );
    }
  });
}
