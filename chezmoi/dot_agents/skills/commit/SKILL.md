---
name: commit
description:
  Create a well-formed git commit from current changes using session history for
  rationale and summary. Use when asked to commit, prepare a commit message, or
  finalize ready work.
---

# Commit

Create one commit that matches the actual staged work.

## Goals

- Produce a commit that reflects the code changes and session context.
- Follow the repo's commit conventions when they exist.
- Include both summary and rationale in the commit body.

## Inputs

- Codex session history for intent and rationale.
- `git status`, `git diff`, and `git diff --staged` for the actual changes.
- Repo-specific commit conventions if documented.

## Steps

1. Read session history to identify scope, intent, and rationale.
2. Inspect the working tree and staged changes with `git status`,
   `git diff`, and `git diff --staged`.
3. Stage only the intended files. Prefer explicit paths or `git add -p`.
   Do not sweep unrelated changes into the commit.
4. Sanity-check newly added files. If anything looks random or likely ignored
   (build artifacts, logs, temp files), stop and fix the index before
   committing.
5. If staging is incomplete or includes unrelated files, fix the index or ask
   for confirmation.
6. Choose a conventional type and optional scope that match the change, such
   as `feat(scope): ...`, `fix(scope): ...`, or `refactor(scope): ...`.
7. Write a subject line in imperative mood, 72 characters or fewer, with no
   trailing period.
8. Write a body that includes:
   - Summary of key changes.
   - Rationale and trade-offs.
   - Validation run, or an explicit note that validation was not run.
9. Wrap body lines at 72 characters.
10. Create the commit message with a here-doc or temp file and use
    `git commit -F <file>` so newlines are literal.
11. Commit only when the message matches the staged changes. If the diff and
    message disagree, fix the index or revise the message first.

## Output

- A single commit whose message reflects the staged work and session context.

## Template

Type and scope are examples only. Adjust them to fit the repo and change.

```text
<type>(<scope>): <short summary>

Summary:
- <what changed>
- <what changed>

Rationale:
- <why>
- <why>

Validation:
- <test or check>
```
