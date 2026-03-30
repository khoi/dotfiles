---
name: pull
description:
  Pull the latest `origin` default branch into the current local branch and
  resolve merge conflicts (aka update-branch). Use when Codex needs to sync a
  feature branch with origin, perform a merge-based update (not rebase), and
  guide conflict resolution best practices.
---

# Pull

## Workflow

1. Verify git status is clean or commit/stash changes before merging.
2. Confirm remotes and branches:
   - Ensure the `origin` remote exists.
   - Ensure the current branch is the one to receive the merge.
   - Determine the default branch for `origin`, for example with
     `git symbolic-ref --short refs/remotes/origin/HEAD | sed 's@^origin/@@'`,
     and store it as `default_branch`.
3. Fetch latest refs:
   - `git fetch origin`
4. Sync the remote feature branch first:
   - `git pull --ff-only origin $(git branch --show-current)`
   - This pulls branch updates made remotely (for example, a GitHub auto-commit)
     before merging `origin/$default_branch`.
5. Merge in order:
   - Prefer
     `git -c merge.conflictstyle=zdiff3 merge "origin/$default_branch"` for
     clearer conflict context.
6. If conflicts appear, resolve them (see conflict guidance below), then:
   - `git add <files>`
   - `git commit` (or `git merge --continue` if the merge is paused)
7. Verify with project checks (follow repo policy in `AGENTS.md`).
8. Summarize the merge:
   - Call out the most challenging conflicts/files and how they were resolved.
   - Note any assumptions or follow-ups.

## Conflict Resolution Guidance (Best Practices)

- Inspect context before editing:
  - Use `git status` to list conflicted files.
  - Use `git diff` or `git diff --merge` to see conflict hunks.
  - Use `git diff :1:path/to/file :2:path/to/file` and
    `git diff :1:path/to/file :3:path/to/file` to compare base vs ours/theirs
    for a file-level view of intent.
  - With `merge.conflictstyle=zdiff3`, conflict markers include:
    - `<<<<<<<` ours, `|||||||` base, `=======` split, `>>>>>>>` theirs.
    - Matching lines near the start/end are trimmed out of the conflict region,
      so focus on the differing core.
  - Summarize the intent of both changes, decide the semantically correct
    outcome, then edit:
    - State what each side is trying to achieve (bug fix, refactor, rename,
      behavior change).
    - Identify the shared goal, if any, and whether one side supersedes the
      other.
    - Decide the final behavior first; only then craft the code to match that
      decision.
    - Prefer preserving invariants, API contracts, and user-visible behavior
      unless the conflict clearly indicates a deliberate change.
  - Open files and understand intent on both sides before choosing a resolution.
- Prefer minimal, intention-preserving edits:
  - Keep behavior consistent with the branch’s purpose.
  - Avoid accidental deletions or silent behavior changes.
- Resolve one file at a time and rerun tests after each logical batch.
- Use `ours/theirs` only when you are certain one side should win entirely.
- For complex conflicts, search for related files or definitions to align with
  the rest of the codebase.
- For generated files, resolve non-generated conflicts first, then regenerate:
  - Prefer resolving source files and handwritten logic before touching
    generated artifacts.
  - Run the CLI/tooling command that produced the generated file to recreate it
    cleanly, then stage the regenerated output.
- For import conflicts where intent is unclear, accept both sides first:
  - Keep all candidate imports temporarily, finish the merge, then run lint/type
    checks to remove unused or incorrect imports safely.
- After resolving, ensure no conflict markers remain:
  - `git diff --check`
- When unsure, note assumptions and ask for confirmation before finalizing the
  merge.

## When To Ask The User (Keep To A Minimum)

Do not ask for input unless there is no safe, reversible alternative. Prefer
making a best-effort decision, documenting the rationale, and proceeding.

Ask the user only when:

- The correct resolution depends on product intent or behavior not inferable
  from code, tests, or nearby documentation.
- The conflict crosses a user-visible contract, API surface, or migration where
  choosing incorrectly could break external consumers.
- A conflict requires selecting between two mutually exclusive designs with
  equivalent technical merit and no clear local signal.
- The merge introduces data loss, schema changes, or irreversible side effects
  without an obvious safe default.
- The branch is not the intended target, or the remote/branch names do not exist
  and cannot be determined locally.

Otherwise, proceed with the merge, explain the decision briefly in notes, and
leave a clear, reviewable commit history.
