import { CustomEditor, type ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Editor, matchesKey } from "@mariozechner/pi-tui";

type KeybindingsLike = {
  matches(data: string, action: "followUp"): boolean;
};

class FollowUpTabEditor extends CustomEditor {
  handleInput(data: string): void {
    if (!matchesKey(data, "tab")) {
      super.handleInput(data);
      return;
    }

    const keybindings = (this as unknown as { keybindings?: KeybindingsLike }).keybindings;
    if (!keybindings?.matches(data, "followUp")) {
      super.handleInput(data);
      return;
    }

    const beforeText = this.getText();
    const beforeCursor = this.getCursor();
    const beforeAutocomplete = this.isShowingAutocomplete();

    Editor.prototype.handleInput.call(this, data);

    const afterText = this.getText();
    const afterCursor = this.getCursor();
    const afterAutocomplete = this.isShowingAutocomplete();

    if (
      beforeText !== afterText ||
      beforeCursor.line !== afterCursor.line ||
      beforeCursor.col !== afterCursor.col ||
      beforeAutocomplete !== afterAutocomplete
    ) {
      return;
    }

    this.actionHandlers.get("followUp")?.();
  }
}

export default function followUpTabExtension(pi: ExtensionAPI): void {
  pi.on("session_start", (_event, ctx) => {
    ctx.ui.setEditorComponent((tui, theme, keybindings) => new FollowUpTabEditor(tui, theme, keybindings));
  });
}
