import importlib.util
import io
import sys
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import AsyncMock, patch

MODULE_PATH = (
    Path(__file__).parents[1]
    / "chezmoi/dot_agents/skills/land/executable_land_watch.py"
)
SPEC = importlib.util.spec_from_file_location("land_watch", MODULE_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"Could not load {MODULE_PATH}")
land_watch = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = land_watch
SPEC.loader.exec_module(land_watch)


def make_pr(**changes):
    values = {
        "number": 42,
        "url": "https://github.com/acme/project/pull/42",
        "title": "Ship it",
        "body": "Ready to merge",
        "head_sha": "abc123",
        "state": "OPEN",
        "mergeable": "MERGEABLE",
        "merge_state": "CLEAN",
        "merge_commit": None,
    }
    values.update(changes)
    return land_watch.PrInfo(**values)


def empty_review_context():
    return [], [], [], None


class LandWatchTests(unittest.IsolatedAsyncioTestCase):
    def test_repo_from_url(self):
        self.assertEqual(
            land_watch.repo_from_url("https://github.com/acme/project/pull/42"),
            ("acme", "project"),
        )

    async def test_short_page_stops_pagination(self):
        response = '[{"id": 1}]'
        with patch.object(
            land_watch,
            "run_gh",
            AsyncMock(return_value=response),
        ) as run_gh:
            items = await land_watch.get_paginated_list("endpoint")

        self.assertEqual(items, [{"id": 1}])
        run_gh.assert_awaited_once()

    async def test_merge_uses_queue_when_enabled(self):
        pr = make_pr()
        queue = land_watch.MergeQueueInfo(enabled=True, queued=False, state=None)
        with patch.object(land_watch, "run_gh", AsyncMock()) as run_gh:
            await land_watch.merge_pr(pr, queue)

        args = run_gh.await_args.args
        self.assertNotIn("--merge", args)
        self.assertIn("--match-head-commit", args)
        self.assertEqual(args[-1], pr.head_sha)

    async def test_merge_uses_merge_commit_without_queue(self):
        pr = make_pr()
        queue = land_watch.MergeQueueInfo(enabled=False, queued=False, state=None)
        with patch.object(land_watch, "run_gh", AsyncMock()) as run_gh:
            await land_watch.merge_pr(pr, queue)

        self.assertIn("--merge", run_gh.await_args.args)

    async def test_ready_requires_checks_and_feedback_to_pass(self):
        pr = make_pr()
        checks = [
            {
                "name": "test",
                "status": "completed",
                "conclusion": "success",
                "completed_at": "2026-08-18T10:00:00Z",
            },
        ]
        with (
            patch.object(land_watch, "get_pr_info", AsyncMock(return_value=pr)),
            patch.object(land_watch, "get_check_runs", AsyncMock(return_value=checks)),
            patch.object(
                land_watch,
                "fetch_review_context",
                AsyncMock(return_value=empty_review_context()),
            ),
            redirect_stdout(io.StringIO()),
        ):
            ready = await land_watch.wait_until_ready(pr)

        self.assertEqual(ready, pr)

    async def test_wait_continues_through_merge_queue(self):
        pr = make_pr()
        merged = make_pr(
            state="MERGED",
            merge_commit="def456",
        )
        queue = land_watch.MergeQueueInfo(
            enabled=True,
            queued=True,
            state="AWAITING_CHECKS",
        )
        with (
            patch.object(
                land_watch,
                "get_pr_info",
                AsyncMock(side_effect=[pr, merged]),
            ),
            patch.object(
                land_watch,
                "get_merge_queue_info",
                AsyncMock(return_value=queue),
            ) as get_queue,
            patch.object(
                land_watch,
                "fetch_review_context",
                AsyncMock(return_value=empty_review_context()),
            ),
            patch.object(land_watch.asyncio, "sleep", AsyncMock()) as sleep,
            redirect_stdout(io.StringIO()),
        ):
            await land_watch.wait_until_merged(pr)

        get_queue.assert_awaited_once()
        sleep.assert_awaited_once_with(land_watch.POLL_SECONDS)

    async def test_feedback_cancels_queued_merge(self):
        pr = make_pr()
        queue = land_watch.MergeQueueInfo(
            enabled=True,
            queued=True,
            state="AWAITING_CHECKS",
        )
        feedback = (
            [
                {
                    "body": "Please change this",
                    "created_at": "2026-08-18T10:00:00Z",
                    "user": {"login": "reviewer", "type": "User"},
                },
            ],
            [],
            [],
            None,
        )
        with (
            patch.object(land_watch, "get_pr_info", AsyncMock(return_value=pr)),
            patch.object(
                land_watch,
                "get_merge_queue_info",
                AsyncMock(return_value=queue),
            ),
            patch.object(
                land_watch,
                "fetch_review_context",
                AsyncMock(return_value=feedback),
            ),
            patch.object(
                land_watch,
                "disable_auto_merge",
                AsyncMock(),
            ) as disable_auto_merge,
            redirect_stdout(io.StringIO()),
            self.assertRaises(SystemExit) as raised,
        ):
            await land_watch.wait_until_merged(pr)

        self.assertEqual(raised.exception.code, 2)
        disable_auto_merge.assert_awaited_once_with(pr.number)

    def test_automated_issue_updates_do_not_count_as_feedback(self):
        issue_comments = [
            {
                "body": "<!-- agent-cost-report:v0 -->\n## Agent Cost Report",
                "created_at": "2026-08-18T10:00:00Z",
                "user": {"login": "github-actions[bot]", "type": "Bot"},
            },
            {
                "body": "<!-- good-board-pr-preview -->\n## Good-Board PR Preview",
                "created_at": "2026-08-18T10:01:00Z",
                "user": {"login": "github-actions[bot]", "type": "Bot"},
            },
        ]

        land_watch.raise_on_feedback((issue_comments, [], [], None))


if __name__ == "__main__":
    unittest.main()
