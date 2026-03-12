import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { writeFileSync } from "node:fs";

type ProgressState = "remove" | "set" | "error" | "indeterminate" | "pause";

const ESC = "\u001b";
const BEL = "\u0007";
const ST = `${ESC}\\`;
const CLEAR_DELAY_MS = 150;

const stateCode: Record<ProgressState, number> = {
  remove: 0,
  set: 1,
  error: 2,
  indeterminate: 3,
  pause: 4,
};

function clampProgress(progress: number): number {
  return Math.max(0, Math.min(100, Math.round(progress)));
}

function buildSequence(state: ProgressState, progress?: number): string {
  const code = stateCode[state];
  if (state === "set" || state === "error" || state === "pause") {
    if (typeof progress === "number" && Number.isFinite(progress)) {
      return `${ESC}]9;4;${code};${clampProgress(progress)}${BEL}`;
    }
  }
  return `${ESC}]9;4;${code}${BEL}`;
}

function wrapForTmux(sequence: string): string {
  return `${ESC}Ptmux;${sequence.replaceAll(ESC, `${ESC}${ESC}`)}${ST}`;
}

function writeSequence(sequence: string) {
  try {
    writeFileSync("/dev/tty", process.env.TMUX ? wrapForTmux(sequence) : sequence);
  } catch {}
}

function extractProgress(candidate: unknown): number | undefined {
  if (!candidate || typeof candidate !== "object") return undefined;
  const details = (candidate as { details?: unknown }).details;
  if (!details || typeof details !== "object") return undefined;
  const progress = (details as { progress?: unknown }).progress;
  if (typeof progress !== "number" || !Number.isFinite(progress)) return undefined;
  return clampProgress(progress);
}

function canEmit(hasUI: boolean): boolean {
  return hasUI && process.stdout.isTTY === true;
}

export default function terminalProgress(pi: ExtensionAPI) {
  let activeAgents = 0;
  let clearTimer: ReturnType<typeof setTimeout> | undefined;

  function cancelPendingClear() {
    if (clearTimer) {
      clearTimeout(clearTimer);
      clearTimer = undefined;
    }
  }

  function emit(hasUI: boolean, state: ProgressState, progress?: number) {
    if (!canEmit(hasUI)) return;
    cancelPendingClear();
    writeSequence(buildSequence(state, progress));
  }

  pi.on("agent_start", async (_event, ctx) => {
    activeAgents += 1;
    emit(ctx.hasUI, "indeterminate");
  });

  pi.on("tool_execution_start", async (_event, ctx) => {
    emit(ctx.hasUI, "indeterminate");
  });

  pi.on("tool_execution_update", async (event, ctx) => {
    const progress = extractProgress(event.partialResult);
    if (progress == null) return;
    emit(ctx.hasUI, "set", progress);
  });

  pi.on("tool_execution_end", async (event, ctx) => {
    if (event.isError) {
      emit(ctx.hasUI, "error", extractProgress(event.result));
      return;
    }

    const progress = extractProgress(event.result);
    if (progress == null) return;
    emit(ctx.hasUI, progress >= 100 ? "pause" : "set", progress);
  });

  pi.on("agent_end", async (_event, ctx) => {
    activeAgents = Math.max(0, activeAgents - 1);
    if (!canEmit(ctx.hasUI) || activeAgents > 0) return;

    emit(ctx.hasUI, "set", 100);
    clearTimer = setTimeout(() => {
      writeSequence(buildSequence("remove"));
      clearTimer = undefined;
    }, CLEAR_DELAY_MS);
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    activeAgents = 0;
    emit(ctx.hasUI, "remove");
  });
}
