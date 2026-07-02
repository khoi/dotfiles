---
name: supaterm-codex-worktree-tab
description: Create an isolated git worktree, bootstrap it, and launch Codex in a new Supaterm tab with an issue-specific prompt. Use when the user asks to create worktrees for issues or branches and spawn Codex agents in Supaterm tabs to work on them.
---

# Supaterm Codex Worktree Tab

Use this for delegated implementation work where each issue needs its own worktree and Codex tab.

## Workflow

1. Read repo instructions first.
2. Fetch issue details before launching, using Linear or the project tracker when available. The `linear` CLI's default workspace may not match the repo; pass `-w <workspace>` when needed. Check attached PRs and their merge states — they define what work actually remains.
3. Check existing worktrees and branches for the issue. Reattach to useful unmerged work; do not reset it. If an existing branch is already merged and its worktree is clean, treat that work as finished: leave it alone, create a fresh worktree and branch, and scope the prompt to what remains.
4. Create or choose the worktree path and branch.
5. Check whether the repo's bootstrap script already copies environment files (the helper runs `.mise/bin/bootstrap-worktree` when present). Only copy files it does not handle, preserving permissions; do not assume file names across repos.
6. Write one prompt file per issue under `/tmp/codex-prompts/<repo-name>/`. Always write it fresh: a stale prompt file from an earlier session may describe work that is already done, and reusing it silently sends Codex the wrong task.
7. Keep the prompt strictly task-related. Do not restate repo instructions, AGENTS.md rules, or generic coding-agent rules because the spawned Codex session inherits its own instruction context. Include only:
   - issue key, title, URL, status, labels, and description
   - worktree path and branch name
   - how to find the app URL: per-worktree ports are computed during bootstrap, after the prompt is written, so tell Codex how to derive the URL inside the worktree (e.g. `mise exec -- printenv <APP_URL_VAR>`) instead of guessing it up front
   - task-specific context such as existing branch or PR work, related issues, dependencies, or non-obvious constraints
   - required proof specific to the task, such as focused tests, E2E steps, or screenshot evidence
   - browser rule: if browser-visible, require `$agent-browser`, reading `/Users/Developer/.agents/skills/agent-browser/SKILL.md`, and `agent-browser skills get core`
8. Run `scripts/launch.py` once per issue. Pass `--env-keys` with the repo's port/URL variables to echo them in the launch summary.
9. Capture the pane scrollback after launch and verify Codex received the prompt.

## Command

```sh
/Users/Developer/.agents/skills/supaterm-codex-worktree-tab/scripts/launch.py \
  --repo "$PWD" \
  --issue ABC-1234 \
  --branch khoi/abc-1234-short-title \
  --worktree "$PWD/.codex/worktrees/$(basename "$PWD")/abc-1234-short-title" \
  --prompt-file "/tmp/codex-prompts/$(basename "$PWD")/ABC-1234.md" \
  --env-keys COMPOSE_PROJECT_NAME,MYAPP_PUBLIC_APP_URL
```

The helper:

- fetches `origin/main`
- creates or reuses the worktree
- runs `.mise/bin/bootstrap-worktree` when present
- prints the values of `--env-keys` (default `COMPOSE_PROJECT_NAME`) from the worktree's mise env when available
- opens a background Supaterm tab in the worktree (pass `--focus` to focus it)
- sends `codex --cd <worktree> "$(cat <prompt-file>)"`

## Verification

After each launch:

```sh
sp pane capture --scope scrollback --lines 100 <pane-id>
git -C <worktree> status --short --branch
```

Stop only after each requested issue has one worktree, one prompt file, one launched Supaterm tab, and a captured pane showing Codex received the prompt.
