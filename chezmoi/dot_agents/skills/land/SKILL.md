---
name: land
description:
  Land a PR by monitoring conflicts, resolving them, waiting for checks, and
  creating a merge commit when green; use when asked to land, merge, or shepherd
  a PR to completion.
---

# Land

## Goals

- Ensure the PR is conflict-free with main.
- Keep CI green and fix failures when they occur.
- Create a merge commit once checks pass.
- Do not yield to the user until the PR is merged; keep the watcher loop running
  unless blocked.
- No need to delete remote branches after merge; the repo auto-deletes head
  branches.

## Preconditions

- `gh` CLI is authenticated.
- You are on the PR branch with a clean working tree.

## Steps

1. Locate the PR for the current branch.
2. Confirm the full gauntlet is green locally before any push.
3. If the working tree has uncommitted changes, commit with the `commit` skill
   and run `git push` before proceeding.
4. Check mergeability and conflicts against main.
5. If conflicts exist, fetch and merge `origin/main`, resolve conflicts, commit,
   and push the updated branch.
6. Ensure Codex review comments (if present) are acknowledged and any required
   fixes are handled before merging.
7. Start the land watcher once. It owns CI, review checks, merge, and merge
   queue state until the PR merges or needs action.
8. If the watcher fails, address the cause, push any fix, then start it again.
9. **Context guard:** Before implementing review feedback, confirm it does not
    conflict with the user’s stated intent or task context. If it conflicts,
    respond inline with a justification and ask the user before changing code.
10. **Pushback template:** When disagreeing, reply inline with: acknowledge +
    rationale + offer alternative.
11. **Ambiguity gate:** When ambiguity blocks progress, use the clarification
    flow (assign PR to current GH user, mention them, wait for response). Do not
    implement until ambiguity is resolved.
    - If you are confident you know better than the reviewer, you may proceed
      without asking the user, but reply inline with your rationale.
12. **Per-comment mode:** For each review comment, choose one of: accept,
    clarify, or push back. Reply inline (or in the issue thread for Codex
    reviews) stating the mode before changing code.
13. **Reply before change:** Always respond with intended action before pushing
    code changes (inline for review comments, issue thread for Codex reviews).

## Commands

```
python3 "$HOME/.agents/skills/land/land_watch.py"
```

## Durable Wait

Run the watcher in one `functions.exec` cell. Keep its terminal session alive
inside that cell:

```javascript
let result = await tools.exec_command({
  cmd: 'python3 "$HOME/.agents/skills/land/land_watch.py"',
  yield_time_ms: 30000,
  max_output_tokens: 10000,
})
let output = result.output
while (result.session_id) {
  result = await tools.write_stdin({
    session_id: result.session_id,
    chars: "",
    yield_time_ms: 300000,
    max_output_tokens: 10000,
  })
  output += result.output
}
text(output)
```

If `functions.exec` returns `Script running with cell ID ...`, call
`functions.wait` with that same cell ID and the longest permitted
`yield_time_ms`. Repeat only if that same cell still runs. This resumes the
existing code; it does not start a model polling turn or a new watcher. Call
`functions.wait` directly, not from another `functions.exec` cell.

While the cell runs, do not start a new `functions.exec`, call
`tools.write_stdin` from another cell, run `gh pr checks`, `gh run view`, or
sleep to poll CI. Wait for the cell. The watcher prints only state changes and
exits when the PR merges or needs action.

Exit codes:

- 0: PR merged
- 1: GitHub CLI or API failed
- 2: Review comments detected (address feedback)
- 3: CI or merge queue failed
- 4: PR head updated
- 5: PR conflicts with main
- 6: PR closed without merging

## Failure Handling

- If checks fail, pull details with `gh pr checks` and `gh run view --log`, then
  fix locally, commit with the `commit` skill, push, and re-run the watch.
- Use judgment to identify flaky failures. If a failure is a flake (e.g., a
  timeout on only one platform), you may proceed without fixing it.
- If CI pushes an auto-fix commit (authored by GitHub Actions), it does not
  trigger a fresh CI run. Detect the updated PR head, pull locally, merge
  `origin/main` if needed, add a real author commit, and force-push to retrigger
  CI, then restart the checks loop.
- If all jobs fail with corrupted pnpm lockfile errors on the merge commit, the
  remediation is to fetch latest `origin/main`, merge, force-push, and rerun CI.
- If mergeability is `UNKNOWN`, wait and re-check.
- Do not merge while review comments (human or Codex review) are outstanding.
- Codex review jobs retry on failure and are non-blocking; use the presence of
  `## Codex Review — <persona>` issue comments (not job status) as the signal
  that review feedback is available.
- Do not enable auto-merge; this repo has no required checks so auto-merge can
  skip tests.
- If the remote PR branch advanced due to your own prior force-push or merge,
  avoid redundant merges; re-run the formatter locally if needed and
  `git push --force-with-lease`.

## Review Handling

- Codex reviews now arrive as issue comments posted by GitHub Actions. They
  start with `## Codex Review — <persona>` and include the reviewer’s
  methodology + guardrails used. Treat these as feedback that must be
  acknowledged before merge.
- Human review comments are blocking and must be addressed (responded to and
  resolved) before requesting a new review or merging.
- If multiple reviewers comment in the same thread, respond to each comment
  (batching is fine) before closing the thread.
- Fetch review comments via `gh api` and reply with a prefixed comment.
- Use review comment endpoints (not issue comments) to find inline feedback:
  - List PR review comments:
    ```
    gh api repos/{owner}/{repo}/pulls/<pr_number>/comments
    ```
  - PR issue comments (top-level discussion):
    ```
    gh api repos/{owner}/{repo}/issues/<pr_number>/comments
    ```
  - Reply to a specific review comment:
    ```
    gh api -X POST /repos/{owner}/{repo}/pulls/<pr_number>/comments \
      -f body='<response> <!-- land-ack -->' -F in_reply_to=<comment_id>
    ```
- `in_reply_to` must be the numeric review comment id (e.g., `2710521800`), not
  the GraphQL node id (e.g., `PRRC_...`), and the endpoint must include the PR
  number (`/pulls/<pr_number>/comments`).
- If GraphQL review reply mutation is forbidden, use REST.
- A 404 on reply typically means the wrong endpoint (missing PR number) or
  insufficient scope; verify by listing comments first.
- Write every comment as a person would: no bot prefix, no signature, no
  attribution. End the body with the hidden marker `<!-- land-ack -->`, which
  GitHub does not render. The marker is how the land watcher knows the feedback
  is answered; a comment without it counts as unaddressed.
- For Codex review issue comments, reply in the issue thread (not a review
  thread) and state whether you will address the feedback now or defer it
  (include rationale).
- If feedback requires changes:
  - For inline review comments (human), reply with intended fixes **as an inline
    reply to the original review comment** using the review comment endpoint and
    `in_reply_to` (do not use issue comments for this).
  - Implement fixes, commit, push.
  - Reply with the fix details and commit sha in the same place you acknowledged
    the feedback (issue comment for Codex reviews, inline reply for review
    comments).
  - The land watcher treats Codex review issue comments as unresolved until a
    newer marked issue comment is posted acknowledging the findings.
- Only request a new Codex review when you need a rerun (e.g., after new
  commits). Do not request one without changes since the last review.
  - Before requesting a new Codex review, re-run the land watcher and ensure
    there are zero outstanding review comments (all have marked inline replies).
  - After pushing new commits, the Codex review workflow will rerun on PR
    synchronization (or you can re-run the workflow manually). Post a concise
    root-level summary comment so reviewers have the latest delta:
    ```
    Changes since last review:
    - <short bullets of deltas>
    Commits: <sha>, <sha>
    Tests: <commands run>

    <!-- land-ack -->
    ```
  - Only request a new review if there is at least one new commit since the
    previous request.
  - Wait for the next Codex review comment before merging.

## Scope + PR Metadata

- The PR title and description should reflect the full scope of the change, not
  just the most recent fix.
- If review feedback expands scope, decide whether to include it now or defer
  it. You can accept, defer, or decline feedback. If deferring or declining,
  call it out in the root-level update with a brief reason (e.g., out-of-scope,
  conflicts with intent, unnecessary).
- Correctness issues raised in review comments should be addressed. If you plan
  to defer or decline a correctness concern, validate first and explain why the
  concern does not apply.
- Classify each review comment as one of: correctness, design, style,
  clarification, scope.
- For correctness feedback, provide concrete validation (test, log, or
  reasoning) before closing it.
- When accepting feedback, include a one-line rationale in the root-level
  update.
- When declining feedback, offer a brief alternative or follow-up trigger.
- Prefer a single consolidated "review addressed" root-level comment after a
  batch of fixes instead of many small updates.
- For doc feedback, confirm the doc change matches behavior (no doc-only edits
  to appease review).
