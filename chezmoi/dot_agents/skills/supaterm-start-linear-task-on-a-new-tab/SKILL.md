---
name: supaterm-start-linear-task-on-a-new-tab
description: Start work on a Linear issue in a new Supaterm tab backed by a dedicated `wt` worktree and a fresh Codex session. Use when the user asks to start, pick up, spin up, or plan a Linear ticket in a new tab or dedicated worktree, especially when the new tab should inherit ignored and untracked files from the current workspace by default.
---

# Start Linear Task On A New Tab

Use `scripts/start-linear-task-on-a-new-tab.sh` to validate the Linear issue, resolve the issue branch and target worktree path, and open a Supaterm tab without focusing it. The tab itself runs `wt switch --copy-ignored --copy-untracked` before starting Codex with the planning prompt.

## Workflow

1. Resolve the Linear issue identifier from the user request. If the identifier is ambiguous, stop and ask for it.
2. Run the launcher:

```bash
scripts/start-linear-task-on-a-new-tab.sh SUP-34
```

3. Outside Supaterm, pass `--space` and optionally `--window`:

```bash
scripts/start-linear-task-on-a-new-tab.sh SUP-34 --space 1
scripts/start-linear-task-on-a-new-tab.sh SUP-34 --space 1 --window 1
```

4. Let the script fetch `linear issue view --json`, prefer the issue `branchName`, and fall back to a slugged branch name from the issue identifier and title.
5. Let the script resolve any existing worktree for the issue branch, otherwise target `<wt-base>/<branch>`, and compute the repo default branch for `wt switch --from`.
6. Let the script open a Supaterm tab without focusing it from the current repo root. The tab script must run `wt switch <branch> --from <base-ref> --path <worktree> --copy-ignored --copy-untracked && codex "<prompt>"`.
7. Report the resolved worktree path, whether it already existed, branch name, and `sp new-tab --json` payload back to the user.

## Requirements

- Require `git`, `jq`, `linear`, `sp`, `codex`, and `wt` on `PATH`.
- Default every new Linear tab to a `wt` worktree seeded with ignored and untracked files from the current workspace.
- Reuse an existing worktree for the issue branch instead of creating a second one.
- Keep the worktree under `wt base`.
