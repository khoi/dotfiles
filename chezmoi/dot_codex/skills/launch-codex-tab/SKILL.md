---
name: launch-codex-tab
description: Launch an interactive Codex CLI session in a new Supaterm tab with a scoped working directory and multi-line task prompt. Use when the user asks to start, open, launch, or delegate work to Codex in a new Supaterm tab, especially for another worktree or repository folder.
---

# Launch Codex Tab

## Overview

Use this skill to avoid hand-quoting prompts through `sp tab new`. The bundled script writes a temporary launcher, starts interactive Codex in a fresh Supaterm tab, optionally renames the tab, and prints the tab/pane IDs for monitoring.

## Workflow

1. Build the target worktree or folder first.
2. Write the Codex task brief to a prompt file. Prefer a file over an inline shell string for multi-line prompts.
3. Launch the tab:

```bash
/Users/Developer/.codex/skills/launch-codex-tab/scripts/start_codex_tab.py \
  --cwd "$WORKTREE" \
  --title GOO-3034-codex \
  --prompt-file /tmp/goo-3034-codex-prompt.md
```

4. Read the JSON output. It includes `tabID` and `paneID`.
5. If Codex shows a directory trust prompt for a fresh folder, accept it when the directory was just created for the task:

```bash
sp pane send --newline "$PANE_ID" ''
```

6. Monitor the session:

```bash
sp pane capture --scope scrollback --lines 160 "$PANE_ID"
```

## Script

Use `scripts/start_codex_tab.py`.

Important options:

- `--cwd`: directory Codex should use as its workspace.
- `--prompt-file`: file containing the initial Codex prompt.
- `--prompt`: short inline prompt. Avoid this for long or quoted content.
- `--stdin`: read the prompt from stdin.
- `--title`: rename the Supaterm tab after creation.
- `--approval`: Codex approval policy. Defaults to `never`.
- `--sandbox`: Codex sandbox mode. Defaults to `danger-full-access`.
- `--no-focus`: create the tab without focusing it.
- `--dry-run`: print the generated command and launcher without starting Supaterm.

The script starts interactive Codex with `--no-alt-screen` so Supaterm scrollback remains useful. It leaves a shell open after Codex exits by default.

## Prompt Shape

Include:

- task goal
- target directory
- branch or issue references
- repo-specific rules that the spawned Codex must obey
- expected final status, validation, commit, push, or PR behavior

Do not rely on the spawned Codex inheriting this conversation. Put every requirement it needs in the prompt file.

## Failure Handling

If launch fails, run `sp diagnostic` and verify the command is executing inside a Supaterm-connected environment. If Codex exits immediately, capture the pane scrollback and inspect the generated launcher path printed by `--dry-run`.

For `/tmp` and other fresh directories, expect Codex to pause on workspace trust before it runs the prompt. Capture scrollback, then send Enter only if the target directory is the intended workspace.
