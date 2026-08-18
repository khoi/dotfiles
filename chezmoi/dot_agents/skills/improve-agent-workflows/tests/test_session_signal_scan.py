from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path


SCRIPT_DIRECTORY = Path(__file__).parents[1] / "scripts"
SCRIPT = next(
    path
    for path in (
        SCRIPT_DIRECTORY / "session_signal_scan.py",
        SCRIPT_DIRECTORY / "executable_session_signal_scan.py",
    )
    if path.exists()
)
SPEC = importlib.util.spec_from_file_location("session_signal_scan", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class HitFilterTests(unittest.TestCase):
    def test_ignores_injected_skill_text(self) -> None:
        signal = next(item for item in MODULE.SIGNALS if item.key == "user-correction")
        hit = {"session_id": "s1", "text": "<skill> I said this is guidance"}
        self.assertFalse(MODULE.keep_hit(signal, hit))

    def test_keeps_failed_tool_result(self) -> None:
        signal = next(item for item in MODULE.SIGNALS if item.key == "tool-failure")
        hit = {
            "session_id": "s1",
            "text": "Command: test\nProcess exited with code 2\nOutput:\nfailed",
        }
        self.assertTrue(MODULE.keep_hit(signal, hit))

    def test_ignores_successful_output_that_quotes_failure_text(self) -> None:
        signal = next(item for item in MODULE.SIGNALS if item.key == "tool-failure")
        hit = {
            "session_id": "s1",
            "text": "Command: inspect\nProcess exited with code 0\nOutput:\nScript failed is a phrase",
        }
        self.assertFalse(MODULE.keep_hit(signal, hit))

    def test_ignores_search_command_that_mentions_polling(self) -> None:
        signal = next(item for item in MODULE.SIGNALS if item.key == "manual-poll")
        hit = {
            "session_id": "s1",
            "text": "const query = 'write_stdin'; memex search query",
        }
        self.assertFalse(MODULE.keep_hit(signal, hit))

    def test_ignores_patch_text_that_contains_poll_call(self) -> None:
        signal = next(item for item in MODULE.SIGNALS if item.key == "manual-poll")
        hit = {
            "session_id": "s1",
            "text": "const patch = 'tools.write_stdin({session_id: 12})'",
        }
        self.assertFalse(MODULE.keep_hit(signal, hit))

    def test_keeps_direct_watch_command(self) -> None:
        signal = next(item for item in MODULE.SIGNALS if item.key == "manual-poll")
        hit = {
            "session_id": "s1",
            "text": 'const result = await tools.exec_command({cmd: "gh pr checks --watch"})',
        }
        self.assertTrue(MODULE.keep_hit(signal, hit))

    def test_keeps_write_stdin_call(self) -> None:
        signal = next(item for item in MODULE.SIGNALS if item.key == "manual-poll")
        hit = {
            "session_id": "s1",
            "text": "const result = await tools.write_stdin({session_id: 12})",
        }
        self.assertTrue(MODULE.keep_hit(signal, hit))


class SignalReportTests(unittest.TestCase):
    def test_groups_hits_by_session_and_ranks_repeats(self) -> None:
        signal = next(item for item in MODULE.SIGNALS if item.key == "manual-poll")
        hits = [
            {
                "session_id": "one",
                "project": "app",
                "ts": "2026-08-01T00:00:00Z",
                "snippet": "first",
            },
            {
                "session_id": "one",
                "project": "app",
                "ts": "2026-08-01T00:01:00Z",
                "snippet": "second",
            },
            {
                "session_id": "two",
                "project": "app",
                "ts": "2026-08-02T00:00:00Z",
                "snippet": "third",
            },
        ]
        report = MODULE.signal_report(signal, hits, False, 2)
        self.assertEqual(report["sampled_hits"], 3)
        self.assertEqual(report["unique_sessions"], 2)
        self.assertEqual(report["examples"][0]["session_id"], "one")
        self.assertEqual(report["examples"][0]["sampled_hits"], 2)


if __name__ == "__main__":
    unittest.main()
