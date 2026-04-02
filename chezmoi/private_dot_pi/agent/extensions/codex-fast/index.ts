import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

type FastModeState = {
  enabled: boolean;
};

const stateFile = join(homedir(), ".pi", "agent", "state", "codex-fast-mode.json");
const defaultState: FastModeState = { enabled: false };

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const loadState = (): FastModeState => {
  try {
    if (!existsSync(stateFile)) return defaultState;
    const parsed: unknown = JSON.parse(readFileSync(stateFile, "utf8"));
    if (!isRecord(parsed)) return defaultState;
    return { enabled: parsed.enabled === true };
  } catch {
    return defaultState;
  }
};

const saveState = (state: FastModeState): void => {
  mkdirSync(dirname(stateFile), { recursive: true });
  writeFileSync(stateFile, JSON.stringify(state, null, 2));
};

const isFastCapableModel = (ctx: ExtensionContext | ExtensionCommandContext): boolean => {
  const { model } = ctx;
  if (!model) return false;
  return model.provider === "openai-codex" && model.id.startsWith("gpt-5.4");
};

const syncStatus = (
  state: FastModeState,
  ctx: ExtensionContext | ExtensionCommandContext,
): void => {
  const status = state.enabled && isFastCapableModel(ctx) ? "fast" : undefined;
  ctx.ui.setStatus("codex-fast", status);
};

export default function codexFastMode(pi: ExtensionAPI) {
  let state = loadState();

  const setEnabled = (
    enabled: boolean,
    ctx: ExtensionContext | ExtensionCommandContext,
  ): void => {
    state = { enabled };
    saveState(state);
    syncStatus(state, ctx);
  };

  pi.on("session_start", async (_event, ctx) => {
    syncStatus(state, ctx);
  });

  pi.on("model_select", async (_event, ctx) => {
    syncStatus(state, ctx);
  });

  pi.registerCommand("fast", {
    description: "Toggle Codex fast mode",
    handler: async (args, ctx) => {
      if (args.trim().length > 0) {
        ctx.ui.notify("Use /fast with no arguments.", "warning");
        return;
      }

      const enabled = !state.enabled;
      setEnabled(enabled, ctx);
      ctx.ui.notify(`Codex fast mode ${enabled ? "enabled" : "disabled"}.`, "info");
    },
  });

  pi.on("before_provider_request", (event, ctx) => {
    if (!state.enabled) return;
    if (!isFastCapableModel(ctx)) return;
    if (!isRecord(event.payload)) return;

    return {
      ...event.payload,
      service_tier: "priority",
    };
  });
}
