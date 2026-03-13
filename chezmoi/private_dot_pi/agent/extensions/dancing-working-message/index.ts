import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const workingMessage = "Dancing...";

export default function dancingWorkingMessage(pi: ExtensionAPI) {
  pi.on("agent_start", (_event, ctx) => {
    if (!ctx.hasUI) return;
    ctx.ui.setWorkingMessage(workingMessage);
  });
}
