#!/usr/bin/env python3
from __future__ import annotations

import asyncio
import json
import random
import re
from dataclasses import dataclass
from datetime import datetime
from typing import Any
from urllib.parse import urlparse

POLL_SECONDS = 30
CHECKS_APPEAR_TIMEOUT_SECONDS = 120
MERGE_APPEAR_TIMEOUT_SECONDS = 120
CODEX_BOTS = {
    "chatgpt-codex-connector[bot]",
    "github-actions[bot]",
    "codex-gc-app[bot]",
    "app/codex-gc-app",
}
MAX_GH_RETRIES = 5
BASE_GH_BACKOFF_SECONDS = 2
AGENT_REPLY_MARKER = "<!-- land-ack -->"


@dataclass
class PrInfo:
    number: int
    url: str
    title: str
    body: str
    head_sha: str
    state: str
    mergeable: str | None
    merge_state: str | None
    merge_commit: str | None


@dataclass
class MergeQueueInfo:
    enabled: bool
    queued: bool
    state: str | None


class RateLimitError(RuntimeError):
    pass


def is_rate_limit_error(error: str) -> bool:
    return "HTTP 429" in error or "rate limit" in error.lower()


async def run_gh(*args: str) -> str:
    max_delay = BASE_GH_BACKOFF_SECONDS * (2 ** (MAX_GH_RETRIES - 1))
    delay_seconds = BASE_GH_BACKOFF_SECONDS
    last_error = "gh command failed"
    for attempt in range(1, MAX_GH_RETRIES + 1):
        proc = await asyncio.create_subprocess_exec(
            "gh",
            *args,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode == 0:
            return stdout.decode()
        error = stderr.decode().strip() or "gh command failed"
        if not is_rate_limit_error(error):
            raise RuntimeError(error)
        last_error = error
        if attempt >= MAX_GH_RETRIES:
            break
        jitter = random.uniform(0, delay_seconds)
        await asyncio.sleep(min(delay_seconds + jitter, max_delay))
        delay_seconds = min(delay_seconds * 2, max_delay)
    raise RateLimitError(last_error)


async def get_pr_info(pr_number: int | None = None) -> PrInfo:
    args = ["pr", "view"]
    if pr_number is not None:
        args.append(str(pr_number))
    args.extend(
        [
            "--json",
            "number,url,title,body,headRefOid,state,mergeable,mergeStateStatus,mergeCommit",
        ],
    )
    data = await run_gh(*args)
    parsed = json.loads(data)
    merge_commit = parsed.get("mergeCommit")
    return PrInfo(
        number=parsed["number"],
        url=parsed["url"],
        title=parsed["title"],
        body=parsed.get("body") or "",
        head_sha=parsed["headRefOid"],
        state=parsed["state"],
        mergeable=parsed.get("mergeable"),
        merge_state=parsed.get("mergeStateStatus"),
        merge_commit=merge_commit.get("oid") if merge_commit else None,
    )


def repo_from_url(url: str) -> tuple[str, str]:
    parts = urlparse(url).path.strip("/").split("/")
    if len(parts) < 2:
        raise RuntimeError(f"Invalid PR URL: {url}")
    return parts[0], parts[1]


async def get_merge_queue_info(pr: PrInfo) -> MergeQueueInfo:
    owner, repo = repo_from_url(pr.url)
    data = await run_gh(
        "api",
        "graphql",
        "-f",
        "query=query($owner:String!,$repo:String!,$number:Int!){repository(owner:$owner,name:$repo){pullRequest(number:$number){isInMergeQueue,isMergeQueueEnabled,mergeQueueEntry{state}}}}",
        "-f",
        f"owner={owner}",
        "-f",
        f"repo={repo}",
        "-F",
        f"number={pr.number}",
    )
    parsed = json.loads(data)["data"]["repository"]["pullRequest"]
    entry = parsed.get("mergeQueueEntry")
    return MergeQueueInfo(
        enabled=parsed["isMergeQueueEnabled"],
        queued=parsed["isInMergeQueue"],
        state=entry.get("state") if entry else None,
    )


async def get_paginated_list(endpoint: str) -> list[dict[str, Any]]:
    page = 1
    items: list[dict[str, Any]] = []
    while True:
        data = await run_gh(
            "api",
            "--method",
            "GET",
            endpoint,
            "-f",
            "per_page=100",
            "-f",
            f"page={page}",
        )
        batch = json.loads(data)
        if not batch:
            break
        items.extend(batch)
        if len(batch) < 100:
            break
        page += 1
    return items


async def get_issue_comments(pr_number: int) -> list[dict[str, Any]]:
    return await get_paginated_list(
        f"repos/{{owner}}/{{repo}}/issues/{pr_number}/comments",
    )


async def get_review_comments(pr_number: int) -> list[dict[str, Any]]:
    return await get_paginated_list(
        f"repos/{{owner}}/{{repo}}/pulls/{pr_number}/comments",
    )


async def get_reviews(pr_number: int) -> list[dict[str, Any]]:
    page = 1
    reviews: list[dict[str, Any]] = []
    while True:
        data = await run_gh(
            "api",
            "--method",
            "GET",
            f"repos/{{owner}}/{{repo}}/pulls/{pr_number}/reviews",
            "-f",
            "per_page=100",
            "-f",
            f"page={page}",
        )
        batch = json.loads(data)
        if not batch:
            break
        reviews.extend(batch)
        if len(batch) < 100:
            break
        page += 1
    return reviews


async def get_check_runs(head_sha: str) -> list[dict[str, Any]]:
    page = 1
    check_runs: list[dict[str, Any]] = []
    while True:
        data = await run_gh(
            "api",
            "--method",
            "GET",
            f"repos/{{owner}}/{{repo}}/commits/{head_sha}/check-runs",
            "-f",
            "per_page=100",
            "-f",
            f"page={page}",
        )
        payload = json.loads(data)
        batch = payload.get("check_runs", [])
        if not batch:
            break
        check_runs.extend(batch)
        total_count = payload.get("total_count")
        if len(batch) < 100 or (
            total_count is not None and len(check_runs) >= total_count
        ):
            break
        page += 1
    return check_runs


def parse_time(value: str) -> datetime:
    normalized = value.replace("Z", "+00:00")
    return datetime.fromisoformat(normalized)


CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b-\x1f\x7f-\x9f]")


def sanitize_terminal_output(value: str) -> str:
    return CONTROL_CHARS_RE.sub("", value)


def check_timestamp(check: dict[str, Any]) -> datetime | None:
    for key in ("completed_at", "started_at", "run_started_at", "created_at"):
        value = check.get(key)
        if value:
            return parse_time(value)
    return None


def dedupe_check_runs(check_runs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    latest_by_name: dict[str, dict[str, Any]] = {}
    for check in check_runs:
        name = check.get("name", "unknown")
        timestamp = check_timestamp(check)
        if name not in latest_by_name:
            latest_by_name[name] = check
            continue
        existing = latest_by_name[name]
        existing_timestamp = check_timestamp(existing)
        if timestamp is None:
            continue
        if existing_timestamp is None or timestamp > existing_timestamp:
            latest_by_name[name] = check
    return list(latest_by_name.values())


def summarize_checks(check_runs: list[dict[str, Any]]) -> tuple[bool, bool, list[str]]:
    if not check_runs:
        return True, False, ["no checks reported"]
    check_runs = dedupe_check_runs(check_runs)
    pending = False
    failed = False
    failures: list[str] = []
    for check in check_runs:
        status = check.get("status")
        conclusion = check.get("conclusion")
        name = check.get("name", "unknown")
        if status != "completed":
            pending = True
            continue
        if conclusion not in ("success", "skipped", "neutral"):
            failed = True
            failures.append(f"{name}: {conclusion}")
    return pending, failed, failures


def latest_review_request_at(comments: list[dict[str, Any]]) -> datetime | None:
    latest: datetime | None = None
    for comment in comments:
        if is_codex_bot_user(comment.get("user", {})):
            continue
        body = comment.get("body") or ""
        if "@codex review" not in body:
            continue
        timestamp = comment_time(comment)
        if timestamp is None:
            continue
        if latest is None or timestamp > latest:
            latest = timestamp
    return latest


def filter_codex_comments(
    comments: list[dict[str, Any]],
    review_requested_at: datetime | None,
) -> list[dict[str, Any]]:
    latest_agent_reply = latest_agent_reply_by_thread(comments)
    latest_issue_ack = latest_agent_reply_time(comments)
    codex_comments = [c for c in comments if is_codex_bot_user(c.get("user", {}))]
    filtered: list[dict[str, Any]] = []
    for comment in codex_comments:
        created_time = comment_time(comment)
        if created_time is None:
            continue
        if review_requested_at is not None and created_time <= review_requested_at:
            continue
        is_threaded = bool(
            comment.get("in_reply_to_id") or comment.get("pull_request_review_id")
        )
        if not is_threaded:
            if latest_issue_ack is not None and created_time <= latest_issue_ack:
                continue
        else:
            thread_root = thread_root_id(comment)
            last_reply = None
            if thread_root is not None:
                last_reply = latest_agent_reply.get(thread_root)
            if last_reply and last_reply > created_time:
                continue
        filtered.append(comment)
    return filtered


def is_codex_bot_user(user: dict[str, Any]) -> bool:
    login = user.get("login") or ""
    return login in CODEX_BOTS


def is_bot_user(user: dict[str, Any]) -> bool:
    login = user.get("login") or ""
    if is_codex_bot_user(user):
        return True
    if user.get("type") == "Bot":
        return True
    return login.endswith("[bot]")


def is_agent_reply_body(body: str) -> bool:
    return AGENT_REPLY_MARKER in body


def is_codex_review_body(body: str) -> bool:
    return body.startswith("## Codex Review")


def latest_agent_reply_time(
    comments: list[dict[str, Any]],
) -> datetime | None:
    latest: datetime | None = None
    for comment in comments:
        body = (comment.get("body") or "").strip()
        if not is_agent_reply_body(body):
            continue
        created_time = comment_time(comment)
        if created_time is None:
            continue
        if latest is None or created_time > latest:
            latest = created_time
    return latest


def filter_human_issue_comments(comments: list[dict[str, Any]]) -> list[dict[str, Any]]:
    latest_ack = latest_agent_reply_time(comments)
    filtered: list[dict[str, Any]] = []
    for comment in comments:
        if is_bot_user(comment.get("user", {})):
            continue
        body = (comment.get("body") or "").strip()
        if is_agent_reply_body(body):
            continue
        if is_codex_review_body(body):
            continue
        if "@codex review" in body:
            continue
        created_time = comment_time(comment)
        if (
            latest_ack is not None
            and created_time is not None
            and created_time <= latest_ack
        ):
            continue
        filtered.append(comment)
    return filtered


def filter_codex_review_issue_comments(
    comments: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    latest_ack = latest_agent_reply_time(comments)
    filtered: list[dict[str, Any]] = []
    for comment in comments:
        body = (comment.get("body") or "").strip()
        if not is_codex_review_body(body):
            continue
        created_time = comment_time(comment)
        if (
            latest_ack is not None
            and created_time is not None
            and created_time <= latest_ack
        ):
            continue
        filtered.append(comment)
    return filtered


def thread_root_id(comment: dict[str, Any]) -> int | None:
    return comment.get("in_reply_to_id") or comment.get("id")


def comment_time(comment: dict[str, Any]) -> datetime | None:
    timestamp = comment.get("updated_at") or comment.get("created_at")
    if not timestamp:
        return None
    return parse_time(timestamp)


def latest_agent_reply_by_thread(
    comments: list[dict[str, Any]],
) -> dict[int, datetime]:
    latest: dict[int, datetime] = {}
    for comment in comments:
        body = (comment.get("body") or "").strip()
        if not is_agent_reply_body(body):
            continue
        thread_root = thread_root_id(comment)
        created_time = comment_time(comment)
        if thread_root is None or created_time is None:
            continue
        existing = latest.get(thread_root)
        if existing is None or created_time > existing:
            latest[thread_root] = created_time
    return latest


def filter_human_review_comments(
    comments: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    latest_agent_reply = latest_agent_reply_by_thread(comments)
    filtered: list[dict[str, Any]] = []
    for comment in comments:
        if is_bot_user(comment.get("user", {})):
            continue
        body = (comment.get("body") or "").strip()
        if is_agent_reply_body(body):
            continue
        thread_root = thread_root_id(comment)
        created_time = comment_time(comment)
        last_agent_reply = None
        if thread_root is not None:
            last_agent_reply = latest_agent_reply.get(thread_root)
        if last_agent_reply and created_time and created_time <= last_agent_reply:
            continue
        filtered.append(comment)
    return filtered


def is_blocking_review(
    review: dict[str, Any],
    review_requested_at: datetime | None,
) -> bool:
    created_at = review.get("submitted_at") or review.get("created_at")
    if not created_at:
        return False
    user_login = review.get("user", {}).get("login")
    created_time = parse_time(created_at)
    if (
        user_login in CODEX_BOTS
        and review_requested_at is not None
        and created_time <= review_requested_at
    ):
        return False
    body = (review.get("body") or "").strip()
    state = review.get("state")
    if user_login in CODEX_BOTS:
        return state == "CHANGES_REQUESTED"
    if is_agent_reply_body(body) or state in ("APPROVED", "DISMISSED"):
        return False
    blocking = False
    if body or state == "CHANGES_REQUESTED":
        blocking = True
    elif state == "COMMENTED":
        blocking = False
    elif state:
        blocking = state not in ("APPROVED", "DISMISSED")
    return blocking


def review_timestamp(review: dict[str, Any]) -> datetime | None:
    created_at = review.get("submitted_at") or review.get("created_at")
    if not created_at:
        return None
    return parse_time(created_at)


def dedupe_reviews(reviews: list[dict[str, Any]]) -> list[dict[str, Any]]:
    latest_by_user: dict[str, dict[str, Any]] = {}
    for review in reviews:
        user_login = review.get("user", {}).get("login")
        if not user_login:
            continue
        timestamp = review_timestamp(review)
        if user_login not in latest_by_user:
            latest_by_user[user_login] = review
            continue
        existing = latest_by_user[user_login]
        existing_timestamp = review_timestamp(existing)
        if timestamp is None:
            continue
        if existing_timestamp is None or timestamp > existing_timestamp:
            latest_by_user[user_login] = review
    return list(latest_by_user.values())


def filter_blocking_reviews(
    reviews: list[dict[str, Any]],
    review_requested_at: datetime | None,
) -> list[dict[str, Any]]:
    return [
        review
        for review in dedupe_reviews(reviews)
        if is_blocking_review(review, review_requested_at)
    ]


def is_merge_conflicting(pr: PrInfo) -> bool:
    return pr.mergeable == "CONFLICTING" or pr.merge_state == "DIRTY"


async def fetch_review_context(
    pr_number: int,
) -> tuple[
    list[dict[str, Any]],
    list[dict[str, Any]],
    list[dict[str, Any]],
    datetime | None,
]:
    issue_comments, review_comments, reviews = await asyncio.gather(
        get_issue_comments(pr_number),
        get_review_comments(pr_number),
        get_reviews(pr_number),
    )
    review_request_at = latest_review_request_at(issue_comments)
    return issue_comments, review_comments, reviews, review_request_at


def raise_on_human_feedback(
    issue_comments: list[dict[str, Any]],
    review_comments: list[dict[str, Any]],
    reviews: list[dict[str, Any]],
    review_request_at: datetime | None,
) -> None:
    human_issue_comments = filter_human_issue_comments(issue_comments)
    codex_review_comments = filter_codex_review_issue_comments(issue_comments)
    human_review_comments = filter_human_review_comments(review_comments)
    if human_issue_comments or human_review_comments or codex_review_comments:
        print("Review comments detected. Address before merge.")
        print(
            "Reminder: decide whether feedback stays in scope; defer if needed "
            "and note in your root-level update.",
        )
        raise SystemExit(2)
    blocking_reviews = filter_blocking_reviews(reviews, review_request_at)
    if blocking_reviews:
        print("Review states/comments detected. Address before merge.")
        print(
            "Reminder: keep PR title/description aligned with the full scope "
            "when changes expand.",
        )
        raise SystemExit(2)


def raise_on_feedback(
    review_context: tuple[
        list[dict[str, Any]],
        list[dict[str, Any]],
        list[dict[str, Any]],
        datetime | None,
    ],
) -> None:
    issue_comments, review_comments, reviews, review_request_at = review_context
    raise_on_human_feedback(
        issue_comments,
        review_comments,
        reviews,
        review_request_at,
    )
    bot_comments = filter_codex_comments(review_comments, review_request_at)
    if not bot_comments:
        return
    latest = max(
        bot_comments,
        key=lambda comment: parse_time(comment["created_at"]),
    )
    body = sanitize_terminal_output(latest.get("body") or "").strip()
    if body:
        print("Codex left comments. Address feedback before merge.")
        print(body)
        raise SystemExit(2)


def raise_on_pr_change(pr: PrInfo, head_sha: str) -> None:
    if pr.state == "CLOSED":
        print("PR closed without merging")
        raise SystemExit(6)
    if is_merge_conflicting(pr):
        print(
            "PR has merge conflicts. Resolve against main and push before "
            "running land_watch again.",
        )
        raise SystemExit(5)
    if pr.head_sha != head_sha:
        print("PR head updated; pull the new head and restart land_watch")
        raise SystemExit(4)


async def wait_until_ready(pr: PrInfo) -> PrInfo:
    print("Waiting for CI and review feedback...", flush=True)
    empty_seconds = 0
    while True:
        current, check_runs, review_context = await asyncio.gather(
            get_pr_info(pr.number),
            get_check_runs(pr.head_sha),
            fetch_review_context(pr.number),
        )
        if current.state == "MERGED":
            print_merged(current)
            return current
        raise_on_pr_change(current, pr.head_sha)
        raise_on_feedback(review_context)
        if not check_runs:
            empty_seconds += POLL_SECONDS
            if empty_seconds >= CHECKS_APPEAR_TIMEOUT_SECONDS:
                print("No checks detected after 120s; check CI configuration")
                raise SystemExit(3)
        else:
            empty_seconds = 0
            pending, failed, failures = summarize_checks(check_runs)
            if failed:
                print("Checks failed:")
                for failure in failures:
                    print(f"- {failure}")
                raise SystemExit(3)
            if not pending and current.mergeable != "UNKNOWN":
                print("Checks passed")
                return current
        await asyncio.sleep(POLL_SECONDS)


async def merge_pr(pr: PrInfo, queue: MergeQueueInfo) -> None:
    args = [
        "pr",
        "merge",
        str(pr.number),
        "--subject",
        pr.title,
        "--body",
        pr.body,
        "--match-head-commit",
        pr.head_sha,
    ]
    if not queue.enabled:
        args.append("--merge")
    await run_gh(*args)
    print("Merge requested", flush=True)


async def disable_auto_merge(pr_number: int) -> None:
    try:
        await run_gh("pr", "merge", str(pr_number), "--disable-auto")
    except RuntimeError as error:
        print(f"Could not cancel queued merge: {error}")


def print_merged(pr: PrInfo) -> None:
    suffix = f" at {pr.merge_commit}" if pr.merge_commit else ""
    print(f"Merged {pr.url}{suffix}")


async def wait_until_merged(pr: PrInfo) -> None:
    queue_seen = False
    absent_seconds = 0
    last_queue_state: str | None = None
    while True:
        current = await get_pr_info(pr.number)
        if current.state == "MERGED":
            print_merged(current)
            return
        raise_on_pr_change(current, pr.head_sha)
        queue, review_context = await asyncio.gather(
            get_merge_queue_info(current),
            fetch_review_context(pr.number),
        )
        try:
            raise_on_feedback(review_context)
        except SystemExit as error:
            if error.code == 2 and queue.enabled:
                await disable_auto_merge(pr.number)
            raise
        if queue.queued:
            queue_seen = True
            absent_seconds = 0
            if queue.state != last_queue_state:
                print(f"Merge queue state: {queue.state or 'QUEUED'}", flush=True)
                last_queue_state = queue.state
            if queue.state == "UNMERGEABLE":
                print("Merge queue rejected the PR")
                raise SystemExit(3)
        else:
            absent_seconds += POLL_SECONDS
            if absent_seconds >= MERGE_APPEAR_TIMEOUT_SECONDS:
                if queue_seen:
                    print("PR left the merge queue without merging")
                else:
                    print("PR did not enter the merge queue or merge")
                raise SystemExit(3)
        await asyncio.sleep(POLL_SECONDS)


async def watch_pr() -> None:
    pr = await get_pr_info()
    if pr.state == "MERGED":
        print_merged(pr)
        return
    raise_on_pr_change(pr, pr.head_sha)
    ready = await wait_until_ready(pr)
    if ready.state == "MERGED":
        return
    queue, review_context = await asyncio.gather(
        get_merge_queue_info(ready),
        fetch_review_context(ready.number),
    )
    raise_on_feedback(review_context)
    await merge_pr(ready, queue)
    await wait_until_merged(ready)


if __name__ == "__main__":
    try:
        asyncio.run(watch_pr())
    except SystemExit as exc:
        raise SystemExit(exc.code) from None
    except RuntimeError as exc:
        print(exc)
        raise SystemExit(1) from None
