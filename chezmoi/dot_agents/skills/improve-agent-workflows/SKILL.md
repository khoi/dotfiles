---
name: improve-agent-workflows
description: Audit past agent sessions for repeated friction, wasted turns, missed instructions, and useful patterns, then recommend the smallest durable change to an existing skill, helper script, AGENTS.md, tool setup, or a new skill. Use when asked to improve future Codex sessions, learn from session history, review skill performance, reduce token waste, or find recurring agent mistakes.
---

# Improve Agent Workflows

Find repeated evidence in local session history, confirm each pattern in full context, and place one fix at its narrowest durable owner.

## Scope

Default to the last 30 days across Codex sessions. Narrow to the current repository when the request names a repository, workflow, or repo skill. Honor any stated date, source, project, skill, or session range.

Keep the review local and read-only. Do not share transcripts, retain a second history store, or edit files unless the user asks to apply improvements.

## Workflow

1. Resolve the loaded skill directory and run the bundled scanner against local Codex rollout files:

```bash
python3 "<skill-directory>/scripts/session_signal_scan.py" --days 30
python3 "<skill-directory>/scripts/session_signal_scan.py" --cwd . --days 30
```

2. Add `--include-subagents` only when delegated work matters. Use `--max-sessions 0` only when an uncapped scan is worth the extra local I/O.
3. Treat the scan as candidate discovery, not proof. It detects explicit user corrections, positive outcomes, tool failures, yielded commands, and manual polling.
4. For each candidate, open its `source_path` and inspect the relevant `response_item` records:

```bash
jq -c 'select(.type == "response_item") | {timestamp, payload}' "<source_path>"
```

5. Read the request, the skill version loaded in that session, the failed action, later recovery, and the outcome.
6. Compare the evidence with the current skill, script, AGENTS.md, and relevant git history. Drop anything already fixed.
7. Group only failures with the same cause. Similar wording does not prove the same cause.
8. Rank at most five changes by repeated cost, severity, confidence, and breadth.
9. Present the evidence and proposed changes. Apply them only when the request authorizes edits.

## Evidence Rules

- Require the same cause in at least three separate sessions before adding a lasting rule or creating a skill.
- Allow one severe case to justify a safety guard when it risks data loss, disclosure, or an irreversible external action.
- Count separate sessions, not repeated messages or retries in one session.
- Distinguish a recovered mistake from an unresolved outcome.
- Do not treat keyword counts, tool exit codes, praise, or frustration as proof without reading the full session.
- State when retrieval is partial, capped, stale, or missing.
- Quote only the shortest text needed to support a finding.

## Choose One Owner

Put each improvement in one place:

| Evidence | Owner |
| --- | --- |
| An existing skill triggered but its steps failed | Update that skill |
| The same deterministic steps were repeated by hand | Add or repair its helper script |
| A stable, distinct workflow recurred and no skill owns it | Create a skill |
| A repository or user rule applies across tasks | Update the narrowest AGENTS.md |
| Tool behavior, setup, or missing capability caused the issue | Fix setup or report the tool gap |
| The event was isolated, ambiguous, or already fixed | Make no lasting change |

Prefer an existing owner over a new skill. Do not copy the same rule into AGENTS.md and a skill.

Create a new skill only when the workflow has a clear trigger, stable inputs and outputs, repeat use, and a useful procedure that is not just product documentation.

## Proposal Format

Return one row per candidate:

| Pattern | Session evidence | Cost | Root cause | Smallest durable change | Confidence |
| --- | --- | --- | --- | --- | --- |

Include session IDs, whether each case recovered, and the exact target file or tool. End with `No change` when the evidence does not meet the gate.

## Apply Improvements

When edits are authorized:

1. Read the target owner in full.
2. Use `skill-creator` for every new or changed skill.
3. Search installed and public skills before creating a new one. Reuse a sound workflow instead of cloning it.
4. Use official current documentation for product behavior. Use `gh` for GitHub research.
5. Make the smallest complete change and remove any rule it replaces.
6. Add or update deterministic tests when a helper script changes.
7. Validate the skill and run its scripts on a small real window.
8. Follow repository apply, commit, and push rules.

## Guardrails

- Do not encode a product bug as a permanent agent rule when the product or tool should be fixed.
- Do not create a skill from one clever command, one project fact, or one unverified workaround.
- Do not turn every user preference into a global rule.
- Do not save reports or raw excerpts unless the user asks for an artifact.
- Do not expose secrets, private URLs, full prompts, or full transcripts in the report.
