import { CustomEditor, type ExtensionAPI, type ExtensionContext } from "@mariozechner/pi-coding-agent";

class IdleFollowUpEditor extends CustomEditor {
  private readonly keybindings: ConstructorParameters<typeof CustomEditor>[2];
  private readonly shouldSubmitAsNormalMessage: () => boolean;

  constructor(
    tui: ConstructorParameters<typeof CustomEditor>[0],
    theme: ConstructorParameters<typeof CustomEditor>[1],
    keybindings: ConstructorParameters<typeof CustomEditor>[2],
    shouldSubmitAsNormalMessage: () => boolean,
  ) {
    super(tui, theme, keybindings);
    this.keybindings = keybindings;
    this.shouldSubmitAsNormalMessage = shouldSubmitAsNormalMessage;
  }

  override handleInput(data: string): void {
    if (this.keybindings.matches(data, "app.message.followUp") && this.shouldSubmitAsNormalMessage()) {
      const text = (this.getExpandedText?.() ?? this.getText()).trim();
      if (!text) return;
      this.setText("");
      void this.onSubmit?.(text);
      return;
    }

    super.handleInput(data);
  }
}

export default function (pi: ExtensionAPI) {
  let isAgentBusy = false;
  let isCompacting = false;

  const installEditor = (ctx: ExtensionContext) => {
    ctx.ui.setEditorComponent((tui, theme, keybindings) => {
      return new IdleFollowUpEditor(tui, theme, keybindings, () => !isAgentBusy && !isCompacting);
    });
  };

  pi.on("session_start", (_event, ctx) => {
    isAgentBusy = false;
    isCompacting = false;
    installEditor(ctx);
  });

  pi.on("session_switch", (_event, ctx) => {
    isAgentBusy = false;
    isCompacting = false;
    installEditor(ctx);
  });

  pi.on("session_fork", (_event, ctx) => {
    isAgentBusy = false;
    isCompacting = false;
    installEditor(ctx);
  });

  pi.on("agent_start", () => {
    isAgentBusy = true;
  });

  pi.on("agent_end", () => {
    isAgentBusy = false;
  });

  pi.on("session_before_compact", () => {
    isCompacting = true;
  });

  pi.on("session_compact", () => {
    isCompacting = false;
  });
}
