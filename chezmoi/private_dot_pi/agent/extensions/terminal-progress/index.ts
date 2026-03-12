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

function countToolCalls(candidate: unknown): number {
  if (!candidate || typeof candidate !== "object") return 0;
  const role = (candidate as { role?: unknown }).role;
  const content = (candidate as { content?: unknown }).content;
  if (role !== "assistant" || !Array.isArray(content)) return 0;
  return content.filter((item) => item && typeof item === "object" && (item as { type?: unknown }).type === "toolCall").length;
}

function calculateProgress(total: number, completed: number, activeProgress?: number, hasActiveTool = false): number | undefined {
  if (!Number.isFinite(total) || total <= 0) return undefined;
  const safeCompleted = Math.max(0, Math.min(total, completed));

  if (typeof activeProgress === "number" && Number.isFinite(activeProgress) && safeCompleted < total) {
    return clampProgress(((safeCompleted + activeProgress / 100) / total) * 100);
  }

  if (hasActiveTool && safeCompleted < total) {
    return clampProgress(((safeCompleted + 0.5) / total) * 100);
  }

  return clampProgress((safeCompleted / total) * 100);
}

function canEmit(hasUI: boolean): boolean {
  return hasUI && process.stdout.isTTY === true;
}

export default function terminalProgress(pi: ExtensionAPI) {
  let activeAgents = 0;
  let clearTimer: ReturnType<typeof setTimeout> | undefined;
  let totalToolCalls = 0;
  let completedToolCallIds = new Set<string>();
  let activeToolCallId: string | undefined;
  let activeToolProgress: number | undefined;
  let lastProgress: number | undefined;

  function resetToolProgress() {
    totalToolCalls = 0;
    completedToolCallIds = new Set<string>();
    activeToolCallId = undefined;
    activeToolProgress = undefined;
    lastProgress = undefined;
  }

  function cancelPendingClear() {
    if (clearTimer) {
      clearTimeout(clearTimer);
      clearTimer = undefined;
    }
  }

  function rememberProgress(progress?: number): number | undefined {
    if (typeof progress !== "number" || !Number.isFinite(progress)) return undefined;
    const nextProgress = clampProgress(progress);
    if (typeof lastProgress === "number" && nextProgress < lastProgress && lastProgress < 100) {
      return lastProgress;
    }
    lastProgress = nextProgress;
    return nextProgress;
  }

  function emit(hasUI: boolean, state: ProgressState, progress?: number) {
    if (!canEmit(hasUI)) return;
    cancelPendingClear();
    writeSequence(buildSequence(state, state === "set" || state === "error" || state === "pause" ? rememberProgress(progress) : progress));
  }

  function emitTrackedProgress(hasUI: boolean, state: Exclude<ProgressState, "remove" | "indeterminate">, progress?: number) {
    const trackedProgress = calculateProgress(
      totalToolCalls,
      completedToolCallIds.size,
      activeToolCallId ? activeToolProgress : undefined,
      activeToolCallId != null,
    );
    emit(hasUI, state, trackedProgress ?? progress);
  }

  pi.on("agent_start", async (_event, ctx) => {
    if (activeAgents === 0) resetToolProgress();
    activeAgents += 1;
    emit(ctx.hasUI, "indeterminate");
  });

  pi.on("message_end", async (event) => {
    const toolCalls = countToolCalls(event.message);
    if (toolCalls === 0) return;
    totalToolCalls = toolCalls;
    completedToolCallIds = new Set<string>();
    activeToolCallId = undefined;
    activeToolProgress = undefined;
    lastProgress = undefined;
  });

  pi.on("tool_execution_start", async (event, ctx) => {
    activeToolCallId = event.toolCallId;
    activeToolProgress = undefined;
    const trackedProgress = calculateProgress(totalToolCalls, completedToolCallIds.size, undefined, true);
    if (trackedProgress == null) {
      emit(ctx.hasUI, "indeterminate");
      return;
    }
    emit(ctx.hasUI, "set", trackedProgress);
  });

  pi.on("tool_execution_update", async (event, ctx) => {
    const progress = extractProgress(event.partialResult);
    if (progress == null) return;
    activeToolCallId = event.toolCallId;
    activeToolProgress = progress;
    emitTrackedProgress(ctx.hasUI, "set", progress);
  });

  pi.on("tool_execution_end", async (event, ctx) => {
    completedToolCallIds.add(event.toolCallId);
    if (activeToolCallId === event.toolCallId) {
      activeToolCallId = undefined;
      activeToolProgress = undefined;
    }

    if (event.isError) {
      emitTrackedProgress(ctx.hasUI, "error", extractProgress(event.result));
      return;
    }

    const resultProgress = extractProgress(event.result);
    const isComplete = totalToolCalls > 0 ? completedToolCallIds.size >= totalToolCalls : resultProgress === 100;
    emitTrackedProgress(ctx.hasUI, isComplete ? "pause" : "set", resultProgress);
  });

  pi.on("agent_end", async (_event, ctx) => {
    activeAgents = Math.max(0, activeAgents - 1);
    if (!canEmit(ctx.hasUI) || activeAgents > 0) return;

    emit(ctx.hasUI, "set", 100);
    clearTimer = setTimeout(() => {
      writeSequence(buildSequence("remove"));
      clearTimer = undefined;
    }, CLEAR_DELAY_MS);
    resetToolProgress();
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    activeAgents = 0;
    resetToolProgress();
    emit(ctx.hasUI, "remove");
  });
}
