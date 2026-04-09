---
name: review-using-subprocess
description: Use when the user wants parallel code review with subagents. Determine the base branch, run multiple independent `codex exec review --base <branch>` reviews, deduplicate findings, validate each point against the codebase with read-only inspection, and return validated findings plus an action plan.
---

# Review Using Subprocess

Use this skill for parallel review runs that cross-check each other before anything is reported.

Workflow:

1. Determine the base branch.
2. If the user did not provide `--base`, run `git symbolic-ref --short refs/remotes/origin/HEAD` and use the branch name after `origin/`.
3. If the base branch cannot be determined, stop and ask the user for it.
4. Determine the requested parallelism from `N=<count>`. If omitted, choose a reasonable default.
5. Start `N` subagents and instruct each one to run exactly `codex exec review --base <branch>`.
6. Collect all findings.
7. Deduplicate overlapping findings.
8. Validate each deduplicated finding against the codebase using read-only inspection commands.
9. Return valid findings, rejected findings with a brief reason, and a concrete fix plan.

Rules:

- Use the best models with high thinking always.
- Do not modify code during the review pass unless the user asks for fixes.
- Keep subagent instructions narrow and identical except for the shared base branch.
- Validate findings yourself before presenting them as real.
