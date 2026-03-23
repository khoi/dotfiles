#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


def default_history_path() -> Path:
    xdg_data_home = os.environ.get("XDG_DATA_HOME")
    if xdg_data_home:
        return Path(xdg_data_home).expanduser() / "fish" / "fish_history"
    return Path.home() / ".local" / "share" / "fish" / "fish_history"


def default_title() -> str:
    return os.environ.get("OP_FISH_HISTORY_TITLE", ".fish_history")


def default_vault() -> str | None:
    value = os.environ.get("OP_FISH_HISTORY_VAULT")
    return value if value else None


@dataclass(frozen=True)
class Entry:
    raw: str
    when: int


class OpError(RuntimeError):
    pass


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("backup", "restore", "sync"))
    parser.add_argument("--history", type=Path, default=default_history_path())
    parser.add_argument("--title", default=default_title())
    parser.add_argument("--vault", default=default_vault())
    parser.add_argument("--op", default=os.environ.get("OP_BIN", "op"))
    return parser.parse_args()


def run_op(op: str, *args: str, input_text: str | None = None) -> subprocess.CompletedProcess[str]:
    command = [op, *args]
    try:
        return subprocess.run(
            command,
            input=input_text,
            text=True,
            capture_output=True,
            check=False,
        )
    except FileNotFoundError as exc:
        raise OpError(f"{op} not found") from exc


def vault_args(vault: str | None) -> list[str]:
    return ["--vault", vault] if vault else []


def resolve_document_id(op: str, title: str, vault: str | None) -> str | None:
    result = run_op(op, "document", "list", "--format", "json", *vault_args(vault))
    if result.returncode != 0:
        raise OpError(result.stderr.strip() or "failed to list 1Password documents")
    documents = json.loads(result.stdout or "[]")
    matches = [document for document in documents if document.get("title") == title]
    if not matches:
        return None
    if len(matches) > 1:
        raise OpError(f"multiple 1Password documents matched {title!r}")
    document_id = matches[0].get("id")
    if not document_id:
        raise OpError(f"1Password document {title!r} did not include an id")
    return document_id


def fetch_remote_history(op: str, title: str, vault: str | None) -> tuple[str | None, str]:
    document_id = resolve_document_id(op, title, vault)
    if document_id is None:
        return None, ""
    result = run_op(op, "document", "get", document_id, *vault_args(vault))
    if result.returncode != 0:
        raise OpError(result.stderr.strip() or f"failed to fetch {title!r} from 1Password")
    return document_id, result.stdout


def upsert_remote_history(op: str, title: str, vault: str | None, document_id: str | None, content: str) -> None:
    if document_id is None:
        result = run_op(
            op,
            "document",
            "create",
            "-",
            "--title",
            title,
            "--file-name",
            title,
            *vault_args(vault),
            input_text=content,
        )
    else:
        result = run_op(
            op,
            "document",
            "edit",
            document_id,
            "-",
            "--title",
            title,
            "--file-name",
            title,
            *vault_args(vault),
            input_text=content,
        )
    if result.returncode != 0:
        raise OpError(result.stderr.strip() or f"failed to upload {title!r} to 1Password")


def read_history(path: Path) -> str:
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8")


def write_history(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    path.chmod(0o600)


def parse_entries(content: str) -> list[Entry]:
    lines = content.splitlines(keepends=True)
    entries: list[str] = []
    current: list[str] = []
    for line in lines:
        if line.startswith("- cmd: "):
            if current:
                entries.append("".join(current).rstrip("\n"))
            current = [line]
            continue
        if not current:
            if line.strip():
                raise ValueError("invalid fish history format")
            continue
        current.append(line)
    if current:
        entries.append("".join(current).rstrip("\n"))
    return [Entry(raw=entry, when=parse_when(entry)) for entry in entries]


def parse_when(entry: str) -> int:
    match = re.search(r"^  when: (\d+)$", entry, re.MULTILINE)
    return int(match.group(1)) if match else -1


def merge_history(local_content: str, remote_content: str) -> tuple[str, int, int, int]:
    local_entries = parse_entries(local_content)
    remote_entries = parse_entries(remote_content)
    local_counts: dict[str, int] = {}
    remote_counts: dict[str, int] = {}
    raw_to_entry: dict[str, Entry] = {}
    for entry in local_entries:
        local_counts[entry.raw] = local_counts.get(entry.raw, 0) + 1
        raw_to_entry[entry.raw] = entry
    for entry in remote_entries:
        remote_counts[entry.raw] = remote_counts.get(entry.raw, 0) + 1
        raw_to_entry[entry.raw] = entry
    merged_entries: list[Entry] = []
    for raw, entry in raw_to_entry.items():
        merged_entries.extend([entry] * max(local_counts.get(raw, 0), remote_counts.get(raw, 0)))
    merged_entries.sort(key=lambda entry: (entry.when, entry.raw))
    merged_content = "".join(f"{entry.raw}\n" for entry in merged_entries)
    return merged_content, len(local_entries), len(remote_entries), len(merged_entries)


def print_summary(command: str, history_path: Path, title: str, vault: str | None, counts: tuple[int, int, int]) -> None:
    local_count, remote_count, merged_count = counts
    print(f"command: {command}")
    print(f"history: {history_path}")
    print(f"title: {title}")
    if vault:
        print(f"vault: {vault}")
    print(f"local: {local_count}")
    print(f"remote: {remote_count}")
    print(f"merged: {merged_count}")


def main() -> int:
    os.umask(0o077)
    args = parse_args()
    if shutil.which(args.op) is None:
        raise OpError(f"{args.op} not found")
    local_content = read_history(args.history)
    document_id, remote_content = fetch_remote_history(args.op, args.title, args.vault)
    if args.command == "restore" and document_id is None:
        raise OpError(f"1Password document {args.title!r} not found")
    merged_content, local_count, remote_count, merged_count = merge_history(local_content, remote_content)
    if args.command in {"backup", "sync"}:
        if document_id is None and not args.history.exists():
            raise OpError(f"{args.history} not found")
        write_history(args.history, merged_content)
        upsert_remote_history(args.op, args.title, args.vault, document_id, merged_content)
    else:
        write_history(args.history, merged_content)
    print_summary(args.command, args.history, args.title, args.vault, (local_count, remote_count, merged_count))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OpError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)
