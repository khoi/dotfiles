import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const execAsync = promisify(exec);
const POLL_INTERVAL_MS = 2000;

async function isDarkMode(): Promise<boolean> {
  if (process.platform !== "darwin") return false;

  try {
    const { stdout } = await execAsync(
      "osascript -e 'tell application \"System Events\" to tell appearance preferences to return dark mode'",
    );
    return stdout.trim() === "true";
  } catch {
    return false;
  }
}

export default function macSystemTheme(pi: ExtensionAPI): void {
  let intervalId: ReturnType<typeof setInterval> | undefined;

  pi.on("session_start", async (_event, ctx) => {
    if (!ctx.hasUI || process.platform !== "darwin") return;

    const lightThemeName = ctx.ui.getTheme("minimal-light") ? "minimal-light" : "light";
    const darkThemeName = "dark";

    if (!ctx.ui.getTheme(lightThemeName) || !ctx.ui.getTheme(darkThemeName)) return;

    let currentAppearance: boolean | undefined;

    const syncTheme = async () => {
      const darkMode = await isDarkMode();
      if (darkMode === currentAppearance) return;
      currentAppearance = darkMode;
      ctx.ui.setTheme(darkMode ? darkThemeName : lightThemeName);
    };

    await syncTheme();
    intervalId = setInterval(() => {
      void syncTheme();
    }, POLL_INTERVAL_MS);
  });

  pi.on("session_shutdown", () => {
    if (!intervalId) return;
    clearInterval(intervalId);
    intervalId = undefined;
  });
}
