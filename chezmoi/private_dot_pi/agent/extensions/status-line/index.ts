import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function statusLine(pi: ExtensionAPI) {
  let turnCount = 0;

  pi.on("session_start", async (_event, ctx) => {
    const theme = ctx.ui.theme;
    ctx.ui.setStatus("status-line", theme.fg("dim", "Ready"));
  });

  pi.on("turn_start", async (_event, ctx) => {
    turnCount += 1;
    const theme = ctx.ui.theme;
    const spinner = theme.fg("accent", "●");
    const text = theme.fg("dim", ` Turn ${turnCount}...`);
    ctx.ui.setStatus("status-line", spinner + text);
  });

  pi.on("turn_end", async (_event, ctx) => {
    const theme = ctx.ui.theme;
    const check = theme.fg("success", "✓");
    const text = theme.fg("dim", ` Turn ${turnCount} complete`);
    ctx.ui.setStatus("status-line", check + text);
  });

  pi.on("session_switch", async (event, ctx) => {
    if (event.reason !== "new") return;
    turnCount = 0;
    const theme = ctx.ui.theme;
    ctx.ui.setStatus("status-line", theme.fg("dim", "Ready"));
  });
}
