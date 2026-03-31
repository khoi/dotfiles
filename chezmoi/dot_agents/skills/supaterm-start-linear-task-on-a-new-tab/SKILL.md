---
name: supaterm-start-linear-task-on-a-new-tab
description: Start work on a Linear issue in a new Supaterm tab backed by a dedicated `wt` worktree and a fresh Codex session. Use when the user asks to start, pick up, spin up, or plan a Linear ticket in a new tab or dedicated worktree.
---

## Workflow

1. Resolve the Linear issue identifier from the user request. If the identifier is ambiguous, stop and ask for it.
2. Run the launcher:

```bash
scripts/start-linear-task-on-a-new-tab.sh SUP-34
```

If the users want to do it on multiple issues, use shell loop to do it quickly.

