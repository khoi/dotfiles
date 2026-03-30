---
name: push
description:
  Push current branch changes to origin and create or update the corresponding
  pull request; use when asked to push, publish updates, or create pull request.
---

# Push

## Prerequisites

- `gh` CLI is installed and available in `PATH`.
- `gh auth status` succeeds for GitHub operations in this repo.

## Goals

- Push current branch changes to `origin` safely.
- Create a PR if none exists for the branch, otherwise update the existing PR.
- Keep branch history clean when remote has moved.

## Related Skills

- `pull`: use this when push is rejected or sync is not clean (non-fast-forward,
  merge conflict risk, or stale branch).

## Steps

1. Identify current branch and confirm remote state.
2. Push branch to `origin` with upstream tracking if needed, using whatever
   remote URL is already configured.
3. If push is not clean/rejected:
   - If the failure is a non-fast-forward or sync problem, run the `pull`
     skill to merge the repo's default branch, resolve conflicts, and rerun
     validation.
   - Push again; use `--force-with-lease` only when history was rewritten.
   - If the failure is due to auth, permissions, or workflow restrictions on
     the configured remote, stop and surface the exact error instead of
     rewriting remotes or switching protocols as a workaround.

4. Ensure a PR exists for the branch:
   - If no PR exists, create one.
   - If a PR exists and is open, update it.
   - If branch is tied to a closed/merged PR, create a new branch + PR.
   - Write a proper PR title that clearly describes the change outcome
   - For branch updates, explicitly reconsider whether current PR title still
     matches the latest scope; update it if it no longer does.
5. Write/update PR body explicitly:
   - If `.github/pull_request_template.md` exists, use it and fill every
     section with concrete content for this change.
   - Replace all placeholder comments (`<!-- ... -->`) when using a template.
   - Keep bullets/checkboxes where the template expects them.
   - If PR already exists, refresh body content so it reflects the total PR
     scope (all intended work on the branch), not just the newest commits,
     including newly added work, removed work, or changed approach.
   - Do not reuse stale description text from earlier iterations.
6. Run the repo's standard validation before and after syncing or updating the
   PR, following `AGENTS.md` and local project conventions.
7. Reply with the PR URL from `gh pr view`.

## Commands

```sh
# Identify branch
branch=$(git branch --show-current)

# Minimal validation gate
# Run the repo's standard lint, tests, or validation commands here.

# Initial push: respect the current origin remote.
git push -u origin HEAD

# If that failed because the remote moved, use the pull skill. After
# pull-skill resolution and re-validation, retry the normal push:
git push -u origin HEAD

# If the configured remote rejects the push for auth, permissions, or workflow
# restrictions, stop and surface the exact error.

# Only if history was rewritten locally:
git push --force-with-lease origin HEAD

# Ensure a PR exists (create only if missing)
pr_state=$(gh pr view --json state -q .state 2>/dev/null || true)
if [ "$pr_state" = "MERGED" ] || [ "$pr_state" = "CLOSED" ]; then
  echo "Current branch is tied to a closed PR; create a new branch + PR." >&2
  exit 1
fi

# Write a clear, human-friendly title that summarizes the shipped change.
pr_title="<clear PR title written for this change>"
if [ -z "$pr_state" ]; then
  gh pr create --title "$pr_title"
else
  # Reconsider title on every branch update; edit if scope shifted.
  gh pr edit --title "$pr_title"
fi

# If the repo has a PR template, draft the PR body from it and fill every
# section. Otherwise, write an explicit PR body that covers scope, rationale,
# and validation. Then update the PR:
# gh pr edit --body-file /tmp/pr_body.md

# Show PR URL for the reply
gh pr view --json url -q .url
```

## Notes

- Do not use `--force`; only use `--force-with-lease` as the last resort.
- Distinguish sync problems from remote auth/permission problems:
  - Use the `pull` skill for non-fast-forward or stale-branch issues.
  - Surface auth, permissions, or workflow restrictions directly instead of
    changing remotes or protocols.
