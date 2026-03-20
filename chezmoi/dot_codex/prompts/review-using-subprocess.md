---
description: Run code review using subagents, waiting for result, validate and fix.
argument-hint: [N=<run n reviews in parallel>]
---

Your job is to do code review in parallel using $N subagents (use the best models possible).

Determine the base branch first. If `--base` is not already specified, run `git symbolic-ref --short refs/remotes/origin/HEAD` and use the value after `origin/` as the base branch. If that command fails or returns empty, stop and ask the user for the base branch name.

Tell each of ur subagent to

- Run exactly `codex exec review --base <branch>`
- Return all findings

Once all results are in, do:

- Deduplicate results
- Validate each point with the codebase to ensure it's valid using read-only inspection commands
- Respond with the list after validation, showing what's valid and what's not.
- And also come up with a plan to address those.
