---
name: land
description:
  Land a PR by monitoring conflicts, resolving them, waiting for checks, and
  merging when green; use when asked to land, merge, or shepherd a PR to
  completion.
---

# Land

## Goals

- Ensure the PR is conflict-free with the repo's default branch.
- Keep CI green and fix failures when they occur.
- Merge the PR with the repo's preferred strategy once checks pass.
- Do not yield to the user until the PR is merged; keep the watcher loop
  running unless blocked.
- Clean up the remote branch after merge only if that matches repo policy.

## Preconditions

- `gh` CLI is authenticated.
- You are on the PR branch with a clean working tree.

## Steps

- Locate the PR for the current branch.
- Determine the repo's default branch.
- Confirm the repo's standard local validation is green before any push.
- If the working tree has uncommitted changes, commit with the `commit` skill
  and push with the `push` skill before proceeding.
- Check mergeability and conflicts against the default branch.
- If conflicts exist, use the `pull` skill to fetch and merge the default
  branch, resolve conflicts, then use the `push` skill to publish the updated
  branch.
- Ensure required review feedback is addressed before merging. Human review
  comments are always blocking. Automated review feedback should be handled
  according to repo policy.
- Watch checks until complete.
- If checks fail, pull logs, fix the issue, commit with the `commit` skill,
  push with the `push` skill, and re-run checks.
- When all required checks are green and required review feedback is addressed,
  merge using the repo's preferred strategy and PR title/body.
- **Context guard:** Before implementing review feedback, confirm it does not
  conflict with the user's stated intent or task context. If it conflicts,
  respond inline with a justification and ask the user before changing code.
- **Pushback template:** When disagreeing, reply inline with: acknowledge +
  rationale + offer alternative.
- **Ambiguity gate:** When ambiguity blocks progress and you cannot resolve it
  from code, tests, or repo docs, ask the user before implementing.
- If you are confident you know better than the reviewer, you may proceed
  without asking the user, but reply inline with your rationale.
- **Per-comment mode:** For each review comment, choose one of: accept,
  clarify, or push back. Reply in the relevant thread before changing code.
- **Reply before change:** Always respond with intended action before pushing
  code changes.

## Commands

```
# Ensure branch and PR context
branch=$(git branch --show-current)
pr_number=$(gh pr view --json number -q .number)
pr_title=$(gh pr view --json title -q .title)
pr_body=$(gh pr view --json body -q .body)
default_branch=$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name)

# Check mergeability and conflicts
mergeable=$(gh pr view --json mergeable -q .mergeable)

if [ "$mergeable" = "CONFLICTING" ]; then
  # Run the `pull` skill to handle fetch + merge + conflict resolution against
  # the repo's default branch. Then run the `push` skill to publish the
  # updated branch.
fi

# Watch checks
if ! gh pr checks --watch; then
  gh pr checks
  # Identify failing run and inspect logs
  # gh run list --branch "$branch"
  # gh run view <run-id> --log
  exit 1
fi

# Merge using the repo's preferred strategy.
# Example squash merge:
gh pr merge --squash --subject "$pr_title" --body "$pr_body"
```

## Async Watch Helper

If the repo uses Codex review comments plus GitHub checks, use the asyncio
watcher to monitor review comments, CI, and head updates in parallel:

```
python3 land_watch.py
```

Exit codes:

- 2: Review comments detected
- 3: CI checks failed
- 4: PR head updated externally
- 5: PR is merge-conflicting

If the repo does not use that review flow, prefer `gh pr checks --watch` and
inspect review threads directly.

## Failure Handling

- If checks fail, pull details with `gh pr checks` and `gh run view --log`,
  then fix locally, commit with the `commit` skill, push with the `push`
  skill, and re-run the watch.
- Use judgment to identify flaky failures. If a failure is a flake, you may
  proceed without fixing it.
- If automation or another collaborator updates the PR branch, pull locally,
  sync with the default branch if needed, rerun validation, and push again if a
  new author commit is required to retrigger CI.
- If mergeability is `UNKNOWN`, wait and re-check.
- Do not merge while required review comments or blocking reviews are
  outstanding.
- If the repo uses automated review comments, use the repo's review channels,
  not just CI status, to determine whether feedback is still outstanding.
- Do not enable auto-merge unless the repo's policy and required checks make it
  safe.
- If the remote PR branch advanced due to your own prior force-push or merge,
  avoid redundant merges; re-run formatting locally if needed and
  `git push --force-with-lease`.

## Review Handling

- Human review comments are blocking and must be addressed before requesting a
  new review or merging.
- If the repo uses automated review comments, treat them according to repo
  policy. If they are required, acknowledge and address them before merge.
- If multiple reviewers comment in the same thread, respond to each comment.
- Fetch review comments via `gh api` and reply in the appropriate thread.
- Use review comment endpoints, not issue comments, to find inline feedback:
  - List PR review comments:
    ```
    gh api repos/{owner}/{repo}/pulls/<pr_number>/comments
    ```
  - PR issue comments:
    ```
    gh api repos/{owner}/{repo}/issues/<pr_number>/comments
    ```
  - Reply to a specific review comment:
    ```
    gh api -X POST /repos/{owner}/{repo}/pulls/<pr_number>/comments \
      -f body='<response>' -F in_reply_to=<comment_id>
    ```
- `in_reply_to` must be the numeric review comment id, not the GraphQL node id.
- If GraphQL review reply mutation is forbidden, use REST.
- A 404 on reply typically means the wrong endpoint or insufficient scope;
  verify by listing comments first.
- Follow the repo's established comment conventions. If none exist, use concise
  plain-text replies.
- For automated review issue comments, reply in the issue thread if that is
  where the reviewer posts feedback.
- If feedback requires changes:
  - For inline review comments, reply with intended fixes as an inline reply to
    the original review comment using the review comment endpoint and
    `in_reply_to`.
  - Implement fixes, commit, push.
  - Reply with the fix details and commit sha in the same place you
    acknowledged the feedback.
- Only request a new automated review when you need a rerun after new commits.
  - Before requesting a rerun, ensure there are no outstanding blocking review
    comments.
  - After pushing new commits, post a concise root-level summary comment:
    ```
    Changes since last review:
    - <short bullets of deltas>
    Commits: <sha>, <sha>
    Tests: <commands run>
    ```
  - Only request a new review if there is at least one new commit since the
    previous request.
  - Wait for the next automated review result only if repo policy requires it.

## Scope + PR Metadata

- The PR title and description should reflect the full scope of the change, not
  just the most recent fix.
- If review feedback expands scope, decide whether to include it now or defer
  it. If deferring or declining, call it out in the root-level PR update with a
  brief reason.
- Correctness issues raised in review comments should be addressed. If you plan
  to defer or decline a correctness concern, validate first and explain why the
  concern does not apply.
- Classify each review comment as one of: correctness, design, style,
  clarification, scope.
- For correctness feedback, provide concrete validation before closing it.
- When accepting feedback, include a one-line rationale in the root-level PR
  update.
- When declining feedback, offer a brief alternative or follow-up trigger.
- Prefer a single consolidated "review addressed" root-level comment after a
  batch of fixes instead of many small updates.
- For doc feedback, confirm the doc change matches behavior.
