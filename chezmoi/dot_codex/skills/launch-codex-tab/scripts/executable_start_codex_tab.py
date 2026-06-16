#!/usr/bin/env python3
import argparse
import json
import os
import shlex
import subprocess
import sys
import tempfile
import time
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser(
        description="Launch interactive Codex in a new Supaterm tab."
    )
    parser.add_argument("--cwd", default=os.getcwd())
    parser.add_argument("--title")
    parser.add_argument("--prompt-file")
    parser.add_argument("--prompt")
    parser.add_argument("--stdin", action="store_true")
    parser.add_argument("--launch-cwd")
    parser.add_argument("--approval", default="never")
    parser.add_argument("--sandbox", default="danger-full-access")
    parser.add_argument("--model")
    parser.add_argument("--profile")
    parser.add_argument("--focus", dest="focus", action="store_true", default=True)
    parser.add_argument("--no-focus", dest="focus", action="store_false")
    parser.add_argument("--keep-open", dest="keep_open", action="store_true", default=True)
    parser.add_argument("--no-keep-open", dest="keep_open", action="store_false")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("prompt_args", nargs="*")
    return parser.parse_args()


def prompt_from_args(args):
    sources = [
        bool(args.prompt_file),
        args.prompt is not None,
        args.stdin,
        bool(args.prompt_args),
    ]
    if sum(sources) != 1:
        raise SystemExit("Provide exactly one of --prompt-file, --prompt, --stdin, or prompt args.")
    if args.prompt_file:
        return Path(args.prompt_file).read_text()
    if args.prompt is not None:
        return args.prompt
    if args.stdin:
        return sys.stdin.read()
    return " ".join(args.prompt_args)


def codex_command(args, cwd, prompt_path):
    command = [
        "codex",
        "--no-alt-screen",
        "--ask-for-approval",
        args.approval,
        "--sandbox",
        args.sandbox,
        "--cd",
        str(cwd),
    ]
    if args.model:
        command.extend(["--model", args.model])
    if args.profile:
        command.extend(["--profile", args.profile])
    command.append(f'"$(cat {shlex.quote(str(prompt_path))})"')
    return command


def shell_command(command):
    return " ".join(
        part if part.startswith('"$(cat ') else shlex.quote(part)
        for part in command
    )


def write_temp_file(prefix, suffix, text, mode=0o600):
    handle = tempfile.NamedTemporaryFile(
        "w",
        delete=False,
        prefix=prefix,
        suffix=suffix,
        encoding="utf-8",
    )
    with handle:
        handle.write(text)
    os.chmod(handle.name, mode)
    return Path(handle.name)


def launcher_text(args, cwd, prompt_path):
    command = shell_command(codex_command(args, cwd, prompt_path))
    lines = [
        "#!/bin/zsh",
        f"cd {shlex.quote(str(cwd))} || exit 1",
        command,
        "status=$?",
    ]
    if args.keep_open:
        lines.extend(
            [
                'printf "\\nCodex exited with status %s. Shell left open.\\n" "$status"',
                'exec "${SHELL:-/bin/zsh}" -l',
            ]
        )
    lines.append('exit "$status"')
    return "\n".join(lines) + "\n"


def send_launcher(tab, launcher_path, send_text):
    last_result = None
    for _ in range(20):
        result = subprocess.run(
            ["sp", "pane", "send", "--newline", tab["paneID"], send_text],
            text=True,
            capture_output=True,
        )
        if result.returncode == 0:
            return
        last_result = result
        time.sleep(0.25)

    sys.stderr.write(
        json.dumps(
            {
                "error": "failed to send launcher to pane",
                "tabID": tab.get("tabID"),
                "paneID": tab.get("paneID"),
                "launcherPath": str(launcher_path),
                "sendText": send_text,
                "stderr": last_result.stderr if last_result else "",
            },
            indent=2,
        )
        + "\n"
    )
    raise SystemExit(last_result.returncode if last_result else 1)


def main():
    args = parse_args()
    cwd = Path(args.cwd).expanduser().resolve()
    if not cwd.is_dir():
        raise SystemExit(f"--cwd is not a directory: {cwd}")
    launch_cwd = Path(args.launch_cwd).expanduser().resolve() if args.launch_cwd else cwd
    if not launch_cwd.is_dir():
        raise SystemExit(f"--launch-cwd is not a directory: {launch_cwd}")

    prompt = prompt_from_args(args)
    prompt_path = write_temp_file("codex-tab-prompt-", ".md", prompt)
    launcher_path = write_temp_file(
        "codex-tab-launcher-",
        ".zsh",
        launcher_text(args, cwd, prompt_path),
        mode=0o700,
    )
    send_text = shlex.quote(str(launcher_path))

    tab_command = [
        "sp",
        "tab",
        "new",
        "--json",
        "--focus" if args.focus else "--no-focus",
        "--cwd",
        str(launch_cwd),
    ]

    if args.dry_run:
        print(
            json.dumps(
                {
                    "cwd": str(cwd),
                    "launchCwd": str(launch_cwd),
                    "promptPath": str(prompt_path),
                    "launcherPath": str(launcher_path),
                    "tabCommand": tab_command,
                    "sendText": send_text,
                    "launcher": launcher_path.read_text(),
                },
                indent=2,
            )
        )
        return

    result = subprocess.run(tab_command, text=True, capture_output=True)
    if result.returncode != 0:
        sys.stderr.write(result.stderr)
        raise SystemExit(result.returncode)

    tab = json.loads(result.stdout)
    if args.title:
        subprocess.run(
            ["sp", "tab", "rename", args.title, tab["tabID"]],
            text=True,
            check=True,
            stdout=subprocess.DEVNULL,
        )
        tab["title"] = args.title
    send_launcher(tab, launcher_path, send_text)
    tab["promptPath"] = str(prompt_path)
    tab["launcherPath"] = str(launcher_path)
    tab["cwd"] = str(cwd)
    tab["launchCwd"] = str(launch_cwd)
    tab["sendText"] = send_text
    print(json.dumps(tab, indent=2))


if __name__ == "__main__":
    main()
