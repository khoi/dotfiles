---
name: supaterm-codex-worktree-tab
description: Create an isolated git worktree, bootstrap it, and launch Codex in a new Supaterm tab with an issue-specific prompt. Use when the user asks to create worktrees for issues or branches and spawn Codex agents in Supaterm tabs to work on them.
---

# Supaterm Codex Worktree Tab

Use this for delegated implementation work where each issue needs its own worktree and Codex tab.

## Workflow

1. Read repo instructions first.
2. Fetch issue details before launching, using Linear or the project tracker when available.
3. Check existing worktrees and branches for the issue. Reattach to useful existing work; do not reset it.
4. Create or choose the worktree path and branch.
5. Copy any required environment files yourself, based on the repo's instructions. Preserve file permissions and do not assume file names across repos.
6. Write one prompt file per issue under `/tmp/good-board-codex-prompts/` or another temp path.
7. Keep the prompt strictly task-related. Do not restate repo instructions, AGENTS.md rules, or generic coding-agent rules because the spawned Codex session inherits its own instruction context. Include only:
   - issue key, title, URL, status, labels, and description
   - worktree path, branch name, and expected app URL if known
   - task-specific context such as existing branch or PR work, related issues, dependencies, or non-obvious constraints
   - required proof specific to the task, such as focused tests, E2E steps, or screenshot evidence
   - browser rule: if browser-visible, require `$agent-browser`, reading `/Users/Developer/.agents/skills/agent-browser/SKILL.md`, and `agent-browser skills get core`
8. Run `scripts/launch.py` once per issue.
9. Capture the pane scrollback after launch and verify Codex received the prompt.

## Command

```sh
/Users/Developer/.agents/skills/supaterm-codex-worktree-tab/scripts/launch.py \
  --repo "$PWD" \
  --issue GOO-1234 \
  --branch khoi/goo-1234-short-title \
  --worktree "$PWD/.codex/worktrees/Good-Board/goo-1234-short-title" \
  --prompt-file /tmp/good-board-codex-prompts/GOO-1234.md
```

The helper:

- fetches `origin/main`
- creates or reuses the worktree
- runs `.mise/bin/bootstrap-worktree` when present
- prints `GOODBOARD_WEB_HOST_PORT`, `GOODBOARD_PUBLIC_APP_URL`, and `COMPOSE_PROJECT_NAME` when available
- opens a focused Supaterm tab in the worktree
- sends `codex --cd <worktree> "$(cat <prompt-file>)"`

## Verification

After each launch:

```sh
sp pane capture --scope scrollback --lines 100 <pane-id>
git -C <worktree> status --short --branch
```

Stop only after each requested issue has one worktree, one prompt file, one launched Supaterm tab, and a captured pane showing Codex received the prompt.
