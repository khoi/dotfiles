---
name: parallel-codex-pr-review
description: Run multiple Codex PR reviews in parallel and synthesize results into valid vs nonvalid findings with a fix plan. Use when the user asks for N (by default run 3) parallel review passes, wants automatic base-branch detection, wants deduplication across reviewers, or wants a validated remediation plan from review output.
---

# Parallel Codex PR Review

Run parallel Codex reviews and return all raw review outputs with run separators.

## Quick Start

Use this from the repository root:

```bash
bash scripts/parallel_reviews.sh --count 5
```

## Workflow

1. Run `scripts/parallel_reviews.sh` with `--count <n>`.
2. Let the script detect the repo default branch and use it as `--base`.
3. Wait for all review runs to complete.
4. Read all returned review blocks.
5. Deduplicate and validate all the findings
6. Present:
   - valid findings,
   - nonvalid findings with rejection reasons,
   - an execution plan to fix valid findings.

## Commands

Run 3 reviewers:

```bash
bash scripts/parallel_reviews.sh --count 3
```

Run 8 reviewers and force a base branch:

```bash
bash scripts/parallel_reviews.sh --count 8 --base develop
```
