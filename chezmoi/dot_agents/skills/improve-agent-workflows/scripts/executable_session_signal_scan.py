#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from collections import Counter
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from shutil import which
from typing import Any, Sequence


@dataclass(frozen=True)
class Signal:
    key: str
    title: str


@dataclass(frozen=True)
class Session:
    id: str
    root_id: str
    timestamp: datetime
    cwd: Path
    repository_url: str
    thread_source: str
    source_path: Path


SIGNALS = (
    Signal("user-correction", "Explicit user corrections"),
    Signal("positive-outcome", "Positive outcomes"),
    Signal("tool-failure", "Tool failures"),
    Signal("yielded-command", "Yielded commands"),
    Signal("manual-poll", "Manual polling"),
)

CORRECTION_PATTERN = re.compile(
    r"\b(?:I mean|I said|not what I asked|why did you|you ignored|already told you)\b",
    re.IGNORECASE,
)
POSITIVE_PATTERN = re.compile(
    r"\b(?:looks good|perfect|exactly|fixed|works|great)\b",
    re.IGNORECASE,
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
        description="Find workflow evidence in local Codex rollout files.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    window = parser.add_mutually_exclusive_group()
    window.add_argument("--days", type=int, default=30, help="Inclusive lookback in days.")
    window.add_argument("--since", help="Inclusive start date or timestamp.")
    parser.add_argument("--until", help="Inclusive end date or exclusive timestamp.")
    parser.add_argument("--cwd", type=Path, help="Limit the scan to this repository or path.")
    parser.add_argument(
        "--codex-dir",
        type=Path,
        default=Path.home() / ".codex",
        help="Directory containing Codex rollout files.",
    )
    parser.add_argument("--include-subagents", action="store_true")
    parser.add_argument(
        "--signal",
        action="append",
        choices=[signal.key for signal in SIGNALS],
        help="Scan only this signal. Repeat for more than one.",
    )
    parser.add_argument(
        "--max-sessions",
        type=int,
        default=200,
        help="Newest eligible sessions to scan. Use 0 for no cap.",
    )
    parser.add_argument("--examples", type=int, default=5, help="Examples per signal.")
    parser.add_argument("--format", choices=("markdown", "json"), default="markdown")
    return parser.parse_args()


def parse_timestamp(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=datetime.now().astimezone().tzinfo)
    return parsed.astimezone(timezone.utc)


def parse_bound(value: str, end_of_date: bool) -> datetime:
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        parsed_date = date.fromisoformat(value)
        if end_of_date:
            parsed_date += timedelta(days=1)
        local = datetime.combine(parsed_date, time.min).astimezone()
        return local.astimezone(timezone.utc)
    return parse_timestamp(value)


def time_window(args: argparse.Namespace) -> tuple[datetime, datetime]:
    if args.since:
        start = parse_bound(args.since, False)
    else:
        if args.days < 1:
            raise RuntimeError("--days must be at least 1")
        start_date = date.today() - timedelta(days=args.days - 1)
        start = datetime.combine(start_date, time.min).astimezone().astimezone(timezone.utc)
    end = parse_bound(args.until, True) if args.until else datetime.max.replace(tzinfo=timezone.utc)
    if start >= end:
        raise RuntimeError("The start of the window must be before the end")
    return start, end


def rollout_paths(codex_dir: Path) -> list[Path]:
    roots = (
        codex_dir / "sessions",
        codex_dir / "archived_sessions",
        codex_dir / "scripts" / "sessions",
    )
    return sorted({path for root in roots if root.is_dir() for path in root.rglob("*.jsonl")})


def load_session(path: Path) -> Session | None:
    try:
        with path.open(encoding="utf-8") as handle:
            for line in handle:
                record = json.loads(line)
                if record.get("type") != "session_meta":
                    continue
                payload = record.get("payload") or {}
                session_id = str(payload.get("id") or payload.get("session_id") or path.stem)
                root_id = str(payload.get("session_id") or session_id)
                git = payload.get("git") if isinstance(payload.get("git"), dict) else {}
                return Session(
                    id=session_id,
                    root_id=root_id,
                    timestamp=parse_timestamp(
                        str(payload.get("timestamp") or record.get("timestamp"))
                    ),
                    cwd=Path(str(payload.get("cwd") or "/")).expanduser().resolve(),
                    repository_url=str(git.get("repository_url") or ""),
                    thread_source=str(payload.get("thread_source") or "user"),
                    source_path=path,
                )
    except (OSError, ValueError, json.JSONDecodeError):
        return None
    return None


def repository_url(path: Path) -> str:
    if which("git") is None:
        return ""
    process = subprocess.run(
        ["git", "-C", str(path), "config", "--get", "remote.origin.url"],
        text=True,
        capture_output=True,
    )
    return process.stdout.strip() if process.returncode == 0 else ""


def matches_path(session: Session, target: Path, target_repository_url: str) -> bool:
    if target_repository_url and session.repository_url == target_repository_url:
        return True
    return target == session.cwd or target in session.cwd.parents or session.cwd in target.parents


def select_sessions(
    paths: Sequence[Path],
    args: argparse.Namespace,
    start: datetime,
    end: datetime,
) -> tuple[list[Session], dict[str, Any]]:
    target = args.cwd.expanduser().resolve() if args.cwd else None
    target_repository_url = repository_url(target) if target else ""
    sessions = []
    unreadable = 0
    for path in paths:
        session = load_session(path)
        if session is None:
            unreadable += 1
            continue
        if not start <= session.timestamp < end:
            continue
        if not args.include_subagents and session.thread_source == "subagent":
            continue
        if target and not matches_path(session, target, target_repository_url):
            continue
        sessions.append(session)
    sessions.sort(key=lambda session: session.timestamp, reverse=True)
    eligible = len(sessions)
    capped = args.max_sessions > 0 and eligible > args.max_sessions
    if capped:
        sessions = sessions[: args.max_sessions]
    coverage = {
        "files_found": len(paths),
        "eligible_sessions": eligible,
        "sessions_scanned": len(sessions),
        "session_scan_capped": capped,
        "unreadable_session_files": unreadable,
    }
    return sessions, coverage


def extract_text(value: Any) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return "\n".join(filter(None, (extract_text(item) for item in value)))
    if not isinstance(value, dict):
        return ""
    if isinstance(value.get("text"), str):
        return value["text"]
    return "\n".join(
        filter(
            None,
            (
                extract_text(value.get(key))
                for key in ("content", "output", "input", "arguments", "message")
            ),
        )
    )


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
    return bool(
        re.match(r"Script running with cell ID\b", text, re.IGNORECASE)
        or re.search(r"Process running with session ID\s+\d+", text[:800], re.IGNORECASE)
    )


def is_manual_poll(tool_name: str, text: str) -> bool:
    if tool_name == "write_stdin":
        return True
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


def record_signals(record: dict[str, Any], selected: set[str]) -> set[str]:
    if record.get("type") != "response_item":
        return set()
    payload = record.get("payload") if isinstance(record.get("payload"), dict) else {}
    payload_type = str(payload.get("type") or "")
    matches = set()
    if payload_type == "message" and payload.get("role") == "user":
        text = extract_text(payload.get("content")).strip()
        if text and not text.startswith(IGNORED_USER_PREFIXES):
            if "user-correction" in selected and CORRECTION_PATTERN.search(text):
                matches.add("user-correction")
            if "positive-outcome" in selected and POSITIVE_PATTERN.search(text):
                matches.add("positive-outcome")
        return matches
    if payload_type in {"function_call_output", "custom_tool_call_output"}:
        text = extract_text(payload.get("output"))
        if "tool-failure" in selected and is_tool_failure(text):
            matches.add("tool-failure")
        if "yielded-command" in selected and is_yielded_command(text):
            matches.add("yielded-command")
        return matches
    if payload_type in {"function_call", "custom_tool_call"}:
        text = extract_text(payload.get("input") or payload.get("arguments"))
        if "manual-poll" in selected and is_manual_poll(str(payload.get("name") or ""), text):
            matches.add("manual-poll")
    return matches


def record_text(record: dict[str, Any]) -> str:
    payload = record.get("payload") if isinstance(record.get("payload"), dict) else {}
    payload_type = str(payload.get("type") or "")
    if payload_type == "message":
        return extract_text(payload.get("content"))
    if payload_type in {"function_call_output", "custom_tool_call_output"}:
        return extract_text(payload.get("output"))
    return extract_text(payload.get("input") or payload.get("arguments"))


def compact_text(value: Any, limit: int = 240) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def project_name(session: Session) -> str:
    if session.repository_url:
        return Path(session.repository_url.removesuffix(".git")).name
    return session.cwd.name


def scan_session(
    session: Session,
    selected: set[str],
) -> tuple[Counter[str], dict[str, dict[str, Any]], int]:
    counts: Counter[str] = Counter()
    examples: dict[str, dict[str, Any]] = {}
    invalid_records = 0
    try:
        with session.source_path.open(encoding="utf-8") as handle:
            for line in handle:
                try:
                    record = json.loads(line)
                except json.JSONDecodeError:
                    invalid_records += 1
                    continue
                for key in record_signals(record, selected):
                    counts[key] += 1
                    examples[key] = {
                        "session_id": session.id,
                        "root_session_id": session.root_id,
                        "project": project_name(session),
                        "cwd": str(session.cwd),
                        "timestamp": record.get("timestamp"),
                        "source_path": str(session.source_path),
                        "snippet": compact_text(record_text(record)),
                    }
    except OSError:
        invalid_records += 1
    return counts, examples, invalid_records


def signal_report(
    signal: Signal,
    session_results: Sequence[tuple[Counter[str], dict[str, dict[str, Any]]]],
    example_limit: int,
) -> dict[str, Any]:
    matches = []
    for counts, examples in session_results:
        if not counts[signal.key]:
            continue
        example = dict(examples[signal.key])
        example["matches"] = counts[signal.key]
        matches.append(example)
    matches.sort(key=lambda item: (item["matches"], str(item["timestamp"])), reverse=True)
    return {
        "key": signal.key,
        "title": signal.title,
        "matches": sum(item["matches"] for item in matches),
        "sessions": len(matches),
        "examples": matches[:example_limit],
    }


def build_report(args: argparse.Namespace) -> dict[str, Any]:
    start, end = time_window(args)
    paths = rollout_paths(args.codex_dir.expanduser().resolve())
    sessions, coverage = select_sessions(paths, args, start, end)
    selected_keys = set(args.signal or [signal.key for signal in SIGNALS])
    results = []
    invalid_records = 0
    for session in sessions:
        counts, examples, invalid = scan_session(session, selected_keys)
        results.append((counts, examples))
        invalid_records += invalid
    coverage["invalid_records"] = invalid_records
    scope: dict[str, Any] = {
        "codex_dir": str(args.codex_dir.expanduser().resolve()),
        "since": start.isoformat(),
        "until": None if end == datetime.max.replace(tzinfo=timezone.utc) else end.isoformat(),
        "include_subagents": args.include_subagents,
    }
    if args.cwd:
        scope["cwd"] = str(args.cwd.expanduser().resolve())
    reports = [
        signal_report(signal, results, args.examples)
        for signal in SIGNALS
        if signal.key in selected_keys
    ]
    return {"schema_version": 2, "scope": scope, "coverage": coverage, "signals": reports}


def render_markdown(report: dict[str, Any]) -> str:
    scope = report["scope"]
    coverage = report["coverage"]
    lines = ["# Agent Workflow Signal Scan", ""]
    lines.append(f"- Since: `{scope['since']}`")
    if scope["until"]:
        lines.append(f"- Until: `{scope['until']}`")
    if "cwd" in scope:
        lines.append(f"- Path: `{scope['cwd']}`")
    lines.append(f"- Session files found: {coverage['files_found']}")
    lines.append(f"- Eligible sessions: {coverage['eligible_sessions']}")
    lines.append(f"- Sessions scanned: {coverage['sessions_scanned']}")
    lines.append(
        f"- Session scan capped: {'yes' if coverage['session_scan_capped'] else 'no'}"
    )
    lines.append(f"- Unreadable session files: {coverage['unreadable_session_files']}")
    lines.append(f"- Invalid records: {coverage['invalid_records']}")
    for signal in report["signals"]:
        lines.extend(("", f"## {signal['title']}", ""))
        lines.append(f"- Matches: {signal['matches']}")
        lines.append(f"- Sessions: {signal['sessions']}")
        for example in signal["examples"]:
            lines.append(
                f"- `{example['session_id']}` · `{example['project']}` · "
                f"{example['matches']} match(es) · {example['snippet']} · "
                f"`{example['source_path']}`"
            )
    return "\n".join(lines)


def main() -> int:
    args = parse_args()
    if args.max_sessions < 0 or args.examples < 1:
        print("Error: --max-sessions cannot be negative and --examples must be positive.", file=sys.stderr)
        return 1
    try:
        report = build_report(args)
    except (RuntimeError, ValueError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    if args.format == "json":
        print(json.dumps(report, indent=2))
    else:
        print(render_markdown(report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
