---
name: commit
description:
  Create a well-formed git commit from current changes using session history for
  rationale and summary; use when asked to commit, prepare a commit message, or
  finalize staged work.
---

# Commit

## Goals

- Produce a commit that reflects the actual code changes and the session
  context.
- Prefer a sequence of atomic commits when that tells the clearest story of the
  change.
- Follow common git conventions (type prefix, short subject, wrapped body).
- Include both summary and rationale in the body.

## Inputs

- Codex session history for intent and rationale.
- `git status`, `git diff`, and `git diff --staged` for actual changes.
- Repo-specific commit conventions if documented.

## Steps

1. Read session history to identify scope, intent, and rationale.
2. Inspect the working tree and staged changes (`git status`, `git diff`,
   `git diff --staged`).
3. Break the work into atomic commits when the change contains more than one
   logical step. Each commit should deliver a single, reviewable piece of
   value.
4. Stage only the files and hunks for the current commit after confirming
   scope.
5. Sanity-check newly added files; if anything looks random or likely ignored
   (build artifacts, logs, temp files), flag it to the user before committing.
6. If staging is incomplete or includes unrelated files, fix the index or ask
   for confirmation.
7. Choose a conventional type and optional scope that match the change (e.g.,
   `feat(scope): ...`, `fix(scope): ...`, `refactor(scope): ...`).
8. Write a subject line in imperative mood, <= 72 characters, no trailing
   period.
9. Write a body that includes:
   - Summary of key changes (what changed).
   - Rationale and trade-offs (why it changed).
   - Tests or validation run (or explicit note if not run).
10. Prefer commit messages that explain the value of the change, not just the
    implementation details. Include context or alternatives when they help the
    story.
11. Wrap body lines at 72 characters.
12. Create the commit message with a here-doc or temp file and use
    `git commit -F <file>` so newlines are literal (avoid `-m` with `\n`).
13. Commit only when the message matches the staged changes: if the staged diff
    includes unrelated files or the message describes work that isn't staged,
    fix the index or revise the message before committing.
14. If the final story is clearer after reordering, squashing fixups, or
    rewording commit messages, revise the local history before sharing it.

## Output

- One or more commits created with `git commit` whose messages reflect the
  session and present the change as a clear story.

## Template

Type and scope are examples only; adjust them for each atomic commit.

```
<type>(<scope>): <short summary>

Summary:
- <what changed>
- <what changed>

Rationale:
- <why>
- <why>

Tests:
- <command or "not run (reason)">
```
