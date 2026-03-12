import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

type ProgressState = "remove" | "set" | "error" | "indeterminate" | "pause";

const ESC = "\u001b";
const BEL = "\u0007";
const ST = `${ESC}\\`;
const CLEAR_DELAY_MS = 150;

const STATE_CODE: Record<ProgressState, number> = {
  remove: 0,
  set: 1,
  error: 2,
  indeterminate: 3,
  pause: 4,
};

function clampProgress(progress: number): number {
  return Math.max(0, Math.min(100, Math.round(progress)));
}

function buildOscSequence(state: ProgressState, progress?: number): string {
  const code = STATE_CODE[state];
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

function extractProgress(candidate: unknown): number | undefined {
  if (!candidate || typeof candidate !== "object") return undefined;
  const details = (candidate as { details?: unknown }).details;
  if (!details || typeof details !== "object") return undefined;
  const progress = (details as { progress?: unknown }).progress;
  if (typeof progress !== "number" || !Number.isFinite(progress)) return undefined;
  return clampProgress(progress);
}

function canEmit(ctx: ExtensionContext): boolean {
  return ctx.hasUI && process.stdout.isTTY === true;
}

export default function oscProgress(pi: ExtensionAPI) {
  let activeAgents = 0;
  let clearTimer: ReturnType<typeof setTimeout> | null = null;

  function cancelPendingClear() {
    if (clearTimer) {
      clearTimeout(clearTimer);
      clearTimer = null;
    }
  }

  function emit(ctx: ExtensionContext, state: ProgressState, progress?: number) {
    if (!canEmit(ctx)) return;
    cancelPendingClear();

    const sequence = buildOscSequence(state, progress);
    process.stdout.write(process.env.TMUX ? wrapForTmux(sequence) : sequence);
  }

  function startAgent(ctx: ExtensionContext) {
    activeAgents += 1;
    emit(ctx, "indeterminate");
  }

  function finishAgent(ctx: ExtensionContext) {
    activeAgents = Math.max(0, activeAgents - 1);
    if (!canEmit(ctx)) return;
    if (activeAgents > 0) return;

    emit(ctx, "set", 100);
    clearTimer = setTimeout(() => {
      process.stdout.write(process.env.TMUX ? wrapForTmux(buildOscSequence("remove")) : buildOscSequence("remove"));
      clearTimer = null;
    }, CLEAR_DELAY_MS);
  }

  pi.on("agent_start", async (_event, ctx) => {
    startAgent(ctx);
  });

  pi.on("tool_execution_start", async (_event, ctx) => {
    emit(ctx, "indeterminate");
  });

  pi.on("tool_execution_update", async (event, ctx) => {
    const progress = extractProgress(event.partialResult);
    if (progress == null) return;
    emit(ctx, "set", progress);
  });

  pi.on("tool_execution_end", async (event, ctx) => {
    if (event.isError) {
      emit(ctx, "error", extractProgress(event.result));
      return;
    }

    const progress = extractProgress(event.result);
    if (progress == null) return;
    emit(ctx, progress >= 100 ? "pause" : "set", progress);
  });

  pi.on("agent_end", async (_event, ctx) => {
    finishAgent(ctx);
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    activeAgents = 0;
    emit(ctx, "remove");
  });
}
