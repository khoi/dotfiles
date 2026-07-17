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
  change; each commit builds and passes on its own.
- Subject style: `area: lowercase imperative summary`, where the area is the
  package, directory, or subsystem touched.
- Body only when the change needs explaining, and then as prose about why.

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
7. Choose the area prefix from what the commit touches: the package,
   top-level directory, or subsystem (e.g., `cli: ...`, `docs: ...`,
   `tests: ...`). If a commit spans areas cleanly, that is a sign it should be
   split.
8. Write the subject as `area: summary` — imperative mood, lowercase after
   the colon, <= 72 characters, no trailing period.
9. Decide whether the commit needs a body:
   - Trivial or self-evident change: no body. The subject carries it.
   - Anything else: prose paragraphs (not bullet lists) explaining why the
     change exists — the problem, the root cause, and why this approach over
     the alternatives. Never restate what the diff already shows.
   - Mention tests or validation only when the how of verifying is
     non-obvious.
10. Skip trailer ceremony. Add `Fixes #NNN` only when the commit actually
    closes an issue.
11. Wrap body lines at 72 characters.
12. Create multiline commit messages through stdin with a quoted here-doc, for
    example:

    ```zsh
    git commit -F - <<'EOF'
    subject

    body
    EOF
    ```
13. Commit only when the message matches the staged changes: if the staged diff
    includes unrelated files or the message describes work that isn't staged,
    fix the index or revise the message before committing.
14. If the final story is clearer after reordering, squashing fixups, or
    rewording commit messages, revise the local history before sharing it.

## Output

- One or more commits created with `git commit` whose messages reflect the
  session and present the change as a clear story.

## Examples

Trivial change, subject only:

```
cli: fix typo in --help output
```

Non-trivial change, prose body:

```
config: reject invalid values during startup

Invalid values were accepted during parsing and failed only when first
used, making startup errors harder to diagnose.

Validate each value at the parsing boundary so runtime code can assume
the configuration is valid.
```
