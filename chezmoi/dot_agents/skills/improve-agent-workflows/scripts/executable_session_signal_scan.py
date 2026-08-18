#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from collections import Counter
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path
from shutil import which
from typing import Any, Iterable, Sequence


@dataclass(frozen=True)
class Signal:
    key: str
    title: str
    query: str
    role: str


SIGNALS = (
    Signal(
        "user-correction",
        "Explicit user corrections",
        '"I mean" OR "I said" OR "not what I asked" OR "why did you" OR "you ignored" OR "already told you"',
        "user",
    ),
    Signal(
        "positive-outcome",
        "Positive outcomes",
        '"looks good" OR perfect OR exactly OR fixed OR works OR great',
        "user",
    ),
    Signal(
        "tool-failure",
        "Tool failures",
        '"Script failed" OR "Process exited with code" OR Traceback OR "verification failed"',
        "tool_result",
    ),
    Signal(
        "yielded-command",
        "Yielded commands",
        '"Process running with session ID" OR "Script running with cell ID"',
        "tool_result",
    ),
    Signal(
        "manual-poll",
        "Manual polling",
        'write_stdin OR "gh pr checks --watch"',
        "tool_use",
    ),
)

IGNORED_USER_PREFIXES = (
    "<skill>",
    "<skills_instructions>",
    "<permissions instructions>",
    "<environment_context>",
    "# AGENTS.md instructions",
    "The following is the Codex agent history",
)

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Find high-signal workflow evidence in indexed agent sessions.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    scope = parser.add_mutually_exclusive_group()
    scope.add_argument("--cwd", type=Path, help="Limit the scan to sessions for this path.")
    scope.add_argument("--project", help="Limit the scan to one indexed project name.")
    parser.add_argument("--source", default="codex", help="Indexed session source.")
    parser.add_argument("--days", type=int, default=30, help="Inclusive lookback in days.")
    parser.add_argument("--since", help="Override the start date or timestamp.")
    parser.add_argument(
        "--signal",
        action="append",
        choices=[signal.key for signal in SIGNALS],
        help="Scan only this signal. Repeat for more than one.",
    )
    parser.add_argument("--limit", type=int, default=200, help="Maximum hits per search.")
    parser.add_argument(
        "--per-session", type=int, default=10, help="Maximum hits sampled per session."
    )
    parser.add_argument("--examples", type=int, default=5, help="Examples per signal.")
    parser.add_argument(
        "--session-limit", type=int, default=2000, help="Maximum sessions for cwd scoping."
    )
    parser.add_argument("--format", choices=("markdown", "json"), default="markdown")
    return parser.parse_args()


def run_json(command: Sequence[str]) -> list[dict[str, Any]]:
    process = subprocess.run(command, text=True, capture_output=True)
    if process.returncode != 0:
        message = (process.stderr or process.stdout).strip()
        raise RuntimeError(message or f"Command failed: {command[0]}")
    try:
        payload = json.loads(process.stdout or "[]")
    except json.JSONDecodeError as error:
        raise RuntimeError(f"Invalid JSON from {command[0]}: {error}") from error
    if not isinstance(payload, list):
        raise RuntimeError(f"Unexpected JSON from {command[0]}")
    return [item for item in payload if isinstance(item, dict)]


def start_time(args: argparse.Namespace) -> str:
    if args.since:
        return args.since
    if args.days < 1:
        raise RuntimeError("--days must be at least 1")
    return (date.today() - timedelta(days=args.days - 1)).isoformat()


def cwd_scope(args: argparse.Namespace, since: str) -> tuple[set[str], set[str], bool]:
    if args.cwd is None:
        return set(), set(), False
    command = [
        "memex",
        "sessions",
        "--cwd",
        str(args.cwd.expanduser().resolve()),
        "--source",
        args.source,
        "--since",
        since,
        "--limit",
        str(args.session_limit),
        "--json-array",
    ]
    sessions = run_json(command)
    session_ids = {
        str(item["session_id"])
        for item in sessions
        if isinstance(item.get("session_id"), str)
    }
    projects = {
        str(item["project"])
        for item in sessions
        if isinstance(item.get("project"), str)
    }
    return session_ids, projects, len(sessions) >= args.session_limit


def search_signal(
    signal: Signal,
    args: argparse.Namespace,
    since: str,
    allowed_sessions: set[str],
    cwd_projects: set[str],
) -> tuple[list[dict[str, Any]], bool]:
    projects: list[str | None]
    if args.project:
        projects = [args.project]
    elif args.cwd is not None:
        projects = sorted(cwd_projects)
    else:
        projects = [None]
    hits: dict[tuple[str, int], dict[str, Any]] = {}
    truncated = False
    for project in projects:
        command = [
            "memex",
            "search",
            signal.query,
            "--role",
            signal.role,
            "--source",
            args.source,
            "--since",
            since,
            "--limit",
            str(args.limit),
            "--top-n-per-session",
            str(args.per_session),
            "--sort",
            "ts",
            "--fields",
            "ts,doc_id,session_id,project,role,text,snippet",
            "--json-array",
        ]
        if project:
            command.extend(("--project", project))
        result = run_json(command)
        truncated = truncated or len(result) >= args.limit
        for hit in result:
            session_id = hit.get("session_id")
            doc_id = hit.get("doc_id")
            if allowed_sessions and session_id not in allowed_sessions:
                continue
            if not keep_hit(signal, hit):
                continue
            if isinstance(doc_id, int):
                hits[(str(session_id), doc_id)] = hit
    return sorted(hits.values(), key=lambda hit: str(hit.get("ts", "")), reverse=True), truncated


def keep_hit(signal: Signal, hit: dict[str, Any]) -> bool:
    text = str(hit.get("text", "")).strip()
    if not text or not hit.get("session_id"):
        return False
    if signal.role == "user" and text.startswith(IGNORED_USER_PREFIXES):
        return False
    if signal.key == "tool-failure":
        return is_tool_failure(text)
    if signal.key == "yielded-command":
        return is_yielded_command(text)
    if signal.key == "manual-poll":
        return is_manual_poll(text)
    return True


def is_tool_failure(text: str) -> bool:
    stripped = text.lstrip()
    if re.match(r"Script failed\b", stripped, re.IGNORECASE):
        return True
    header = stripped.split("\nOutput:\n", 1)[0][:800]
    if re.search(r"Process exited with code\s+[1-9]\d*", header, re.IGNORECASE):
        return True
    first_line = stripped.splitlines()[0] if stripped else ""
    return bool(
        re.search(r"Traceback \(most recent call last\)", first_line, re.IGNORECASE)
        or re.search(r"verification failed", first_line, re.IGNORECASE)
        or (
            stripped.startswith("{")
            and re.search(r'"exit_code"\s*:\s*[1-9]\d*', stripped[:800])
        )
    )


def is_yielded_command(text: str) -> bool:
    head = text[:800]
    if "memex search" in head:
        return False
    return bool(
        re.match(r"Script running with cell ID\b", text, re.IGNORECASE)
        or re.search(r"Process running with session ID\s+\d+", head, re.IGNORECASE)
    )


def is_manual_poll(text: str) -> bool:
    if re.match(
        r"\s*(?:const\s+\w+\s*=\s*)?(?:await\s+)?tools\.write_stdin\(",
        text,
    ):
        return True
    if text.startswith("{") and '"session_id"' in text:
        return '"chars"' in text or '"yield_time_ms"' in text
    return bool(
        re.match(
            r"\s*\{[^{}]{0,240}\"cmd\"\s*:\s*\"gh pr checks --watch(?:\"|\s)",
            text,
        )
        or re.match(
            r"\s*(?:const\s+\w+\s*=\s*)?(?:await\s+)?tools\.exec_command\(\{\s*cmd\s*:\s*[\"']gh pr checks --watch(?:[\"']|\s)",
            text,
        )
    )


def compact_text(value: Any, limit: int = 240) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def signal_report(
    signal: Signal,
    hits: Sequence[dict[str, Any]],
    truncated: bool,
    example_limit: int,
) -> dict[str, Any]:
    counts = Counter(str(hit["session_id"]) for hit in hits)
    first_by_session: dict[str, dict[str, Any]] = {}
    for hit in hits:
        first_by_session.setdefault(str(hit["session_id"]), hit)
    ranked_sessions = sorted(
        counts,
        key=lambda session_id: (
            counts[session_id],
            str(first_by_session[session_id].get("ts", "")),
        ),
        reverse=True,
    )
    examples = []
    for session_id in ranked_sessions[:example_limit]:
        hit = first_by_session[session_id]
        examples.append(
            {
                "session_id": session_id,
                "project": hit.get("project"),
                "timestamp": hit.get("ts"),
                "sampled_hits": counts[session_id],
                "snippet": compact_text(hit.get("snippet") or hit.get("text")),
            }
        )
    return {
        "key": signal.key,
        "title": signal.title,
        "role": signal.role,
        "query": signal.query,
        "sampled_hits": len(hits),
        "unique_sessions": len(counts),
        "truncated": truncated,
        "examples": examples,
    }


def build_report(
    args: argparse.Namespace,
    since: str,
    allowed_sessions: set[str],
    cwd_projects: set[str],
    session_scope_truncated: bool,
    selected: Iterable[Signal],
) -> dict[str, Any]:
    reports = []
    for signal in selected:
        hits, truncated = search_signal(
            signal,
            args,
            since,
            allowed_sessions,
            cwd_projects,
        )
        reports.append(signal_report(signal, hits, truncated, args.examples))
    scope: dict[str, Any] = {"source": args.source, "since": since}
    if args.cwd is not None:
        scope["cwd"] = str(args.cwd.expanduser().resolve())
        scope["sessions"] = len(allowed_sessions)
        scope["session_search_capped"] = session_scope_truncated
    if args.project:
        scope["project"] = args.project
    return {"schema_version": 1, "scope": scope, "signals": reports}


def render_markdown(report: dict[str, Any]) -> str:
    scope = report["scope"]
    lines = ["# Agent Workflow Signal Scan", ""]
    lines.append(f"- Source: `{scope['source']}`")
    lines.append(f"- Since: `{scope['since']}`")
    if "cwd" in scope:
        lines.append(f"- Path: `{scope['cwd']}`")
        lines.append(f"- Sessions in scope: {scope['sessions']}")
        lines.append(
            f"- Session search capped: {'yes' if scope['session_search_capped'] else 'no'}"
        )
    if "project" in scope:
        lines.append(f"- Project: `{scope['project']}`")
    for signal in report["signals"]:
        lines.extend(("", f"## {signal['title']}", ""))
        lines.append(f"- Sampled hits: {signal['sampled_hits']}")
        lines.append(f"- Sessions: {signal['unique_sessions']}")
        lines.append(f"- Search capped: {'yes' if signal['truncated'] else 'no'}")
        for example in signal["examples"]:
            lines.append(
                f"- `{example['session_id']}` · `{example['project']}` · "
                f"{example['sampled_hits']} hit(s) · {example['snippet']}"
            )
    return "\n".join(lines)


def main() -> int:
    args = parse_args()
    if which("memex") is None:
        print("Error: memex is not installed or not on PATH.", file=sys.stderr)
        return 1
    if min(args.limit, args.per_session, args.examples, args.session_limit) < 1:
        print("Error: numeric limits must be at least 1.", file=sys.stderr)
        return 1
    try:
        since = start_time(args)
        allowed_sessions, cwd_projects, session_scope_truncated = cwd_scope(args, since)
        selected_keys = set(args.signal or [])
        selected = [
            signal for signal in SIGNALS if not selected_keys or signal.key in selected_keys
        ]
        report = build_report(
            args,
            since,
            allowed_sessions,
            cwd_projects,
            session_scope_truncated,
            selected,
        )
    except RuntimeError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    if args.format == "json":
        print(json.dumps(report, indent=2))
    else:
        print(render_markdown(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
