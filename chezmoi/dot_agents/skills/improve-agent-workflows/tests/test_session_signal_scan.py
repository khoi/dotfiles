from __future__ import annotations

import importlib.util
import json
import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory


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


def response_item(payload: dict[str, object]) -> dict[str, object]:
    return {
        "timestamp": "2026-08-18T09:00:00Z",
        "type": "response_item",
        "payload": payload,
    }


class RecordSignalTests(unittest.TestCase):
    def test_detects_user_correction(self) -> None:
        record = response_item(
            {
                "type": "message",
                "role": "user",
                "content": [{"type": "input_text", "text": "No, not what I asked"}],
            }
        )
        self.assertEqual(
            MODULE.record_signals(record, {"user-correction"}),
            {"user-correction"},
        )

    def test_ignores_injected_skill_text(self) -> None:
        record = response_item(
            {
                "type": "message",
                "role": "user",
                "content": [{"type": "input_text", "text": "<skill>I said this</skill>"}],
            }
        )
        self.assertEqual(MODULE.record_signals(record, {"user-correction"}), set())

    def test_detects_failed_tool_output(self) -> None:
        record = response_item(
            {
                "type": "custom_tool_call_output",
                "output": [{"type": "input_text", "text": "Script failed\nOutput: bad"}],
            }
        )
        self.assertEqual(MODULE.record_signals(record, {"tool-failure"}), {"tool-failure"})

    def test_ignores_successful_output_that_quotes_failure_text(self) -> None:
        record = response_item(
            {
                "type": "custom_tool_call_output",
                "output": [
                    {
                        "type": "input_text",
                        "text": "Script completed\nOutput:\nScript failed is a phrase",
                    }
                ],
            }
        )
        self.assertEqual(MODULE.record_signals(record, {"tool-failure"}), set())

    def test_detects_direct_poll(self) -> None:
        record = response_item(
            {
                "type": "custom_tool_call",
                "name": "exec",
                "input": "const result = await tools.write_stdin({session_id: 12})",
            }
        )
        self.assertEqual(MODULE.record_signals(record, {"manual-poll"}), {"manual-poll"})

    def test_ignores_patch_text_that_contains_poll_call(self) -> None:
        record = response_item(
            {
                "type": "custom_tool_call",
                "name": "exec",
                "input": "const patch = 'tools.write_stdin({session_id: 12})'",
            }
        )
        self.assertEqual(MODULE.record_signals(record, {"manual-poll"}), set())


class RolloutTests(unittest.TestCase):
    def test_scans_rollout_without_an_index(self) -> None:
        with TemporaryDirectory() as directory:
            path = Path(directory) / "rollout.jsonl"
            records = [
                {
                    "timestamp": "2026-08-18T08:00:00Z",
                    "type": "session_meta",
                    "payload": {
                        "id": "session-1",
                        "session_id": "session-1",
                        "timestamp": "2026-08-18T08:00:00Z",
                        "cwd": directory,
                        "thread_source": "user",
                        "git": {"repository_url": "git@example.com:owner/repo.git"},
                    },
                },
                response_item(
                    {
                        "type": "message",
                        "role": "user",
                        "content": [{"type": "input_text", "text": "I mean use the helper"}],
                    }
                ),
                response_item(
                    {
                        "type": "custom_tool_call_output",
                        "output": "Script failed\nOutput: bad",
                    }
                ),
            ]
            path.write_text("\n".join(json.dumps(record) for record in records) + "\n")
            session = MODULE.load_session(path)
            self.assertIsNotNone(session)
            counts, examples, invalid = MODULE.scan_session(
                session,
                {"user-correction", "tool-failure"},
            )
            self.assertEqual(counts["user-correction"], 1)
            self.assertEqual(counts["tool-failure"], 1)
            self.assertEqual(examples["tool-failure"]["source_path"], str(path))
            self.assertEqual(invalid, 0)


if __name__ == "__main__":
    unittest.main()
