---
name: supaterm-start-linear-task-on-a-new-tab
description: Start work on a Linear issue in a new Supaterm tab backed by a dedicated `wt` worktree and a fresh Codex session. Use when the user asks to start, pick up, spin up, or plan a Linear ticket in a new tab or dedicated worktree, especially when the new tab should inherit ignored and untracked files from the current workspace by default.
---

# Start Linear Task On A New Tab

Use `scripts/start-linear-task-on-a-new-tab.sh` to validate the Linear issue, resolve the issue branch, create or reuse a dedicated worktree through `wt`, and open a Supaterm tab without focusing it that starts Codex with the planning prompt.

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
5. Let the script resolve `wt base` and run `wt switch <branch> --path <wt-base>/<branch> --copy-ignored --copy-untracked`, passing `--from` with the repo default branch when it needs to create the branch.
6. Let the script open a Supaterm tab without focusing it and start Codex with the planning prompt populated from the Linear issue details fetched by the launcher.
7. Report the resulting worktree path, branch name, and `sp new-tab --json` payload back to the user.

## Requirements

- Require `git`, `jq`, `linear`, `sp`, `codex`, and `wt` on `PATH`.
- Default every new Linear tab to a `wt` worktree seeded with ignored and untracked files from the current workspace.
- Reuse an existing worktree for the issue branch instead of creating a second one.
- Keep the worktree under `wt base`.
