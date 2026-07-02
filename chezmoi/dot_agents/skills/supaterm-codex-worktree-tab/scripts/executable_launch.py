#!/usr/bin/env python3
import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from shlex import quote


def run(args, cwd=None, capture=True):
    result = subprocess.run(
        args,
        cwd=cwd,
        text=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None,
    )
    if result.returncode != 0:
        if capture:
            sys.stderr.write(result.stdout)
            sys.stderr.write(result.stderr)
        raise SystemExit(result.returncode)
    return result.stdout if capture else ""


def branch_exists(repo, branch):
    return bool(run(["git", "branch", "--list", branch], cwd=repo).strip())


def create_or_reuse_worktree(repo, worktree, branch, base):
    if (worktree / ".git").exists():
        return "reused"
    worktree.parent.mkdir(parents=True, exist_ok=True)
    if branch_exists(repo, branch):
        run(["git", "worktree", "add", str(worktree), branch], cwd=repo)
        return "attached"
    run(["git", "worktree", "add", "-b", branch, str(worktree), base], cwd=repo)
    subprocess.run(["git", "branch", "--unset-upstream"], cwd=worktree)
    return "created"


def bootstrap(worktree, skip):
    script = worktree / ".mise" / "bin" / "bootstrap-worktree"
    if skip or not script.exists():
        return False
    run([str(script)], cwd=worktree, capture=False)
    return True


def worktree_env(worktree, keys):
    try:
        output = run(["mise", "exec", "--", "env"], cwd=worktree)
    except SystemExit:
        return {}
    values = {}
    for line in output.splitlines():
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        if key in keys:
            values[key] = value
    return values


def login_shell():
    user = os.environ.get("USER")
    if user:
        result = subprocess.run(
            ["dscl", ".", "-read", f"/Users/{user}", "UserShell"],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
        )
        if result.returncode == 0 and ":" in result.stdout:
            shell = result.stdout.split(":", 1)[1].strip()
            if shell:
                return shell
    return os.environ.get("SHELL") or "/bin/zsh"


def launch_tab(worktree, prompt_file, codex_bin, focus, space):
    command = ["sp", "tab", "new", "--cwd", str(worktree), "--json"]
    command.append("--focus" if focus else "--no-focus")
    if space:
        command.extend(["--in", space])
    command.extend(["--", login_shell(), "-l"])
    tab = json.loads(run(command))
    pane_id = tab["paneID"]
    codex_command = f"{quote(codex_bin)} --cd {quote(str(worktree))} \"$(cat {quote(str(prompt_file))})\""
    run(["sp", "pane", "send", "--newline", pane_id, codex_command])
    return tab


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default=os.getcwd())
    parser.add_argument("--issue", required=True)
    parser.add_argument("--branch", required=True)
    parser.add_argument("--worktree", required=True)
    parser.add_argument("--prompt-file", required=True)
    parser.add_argument("--base", default="origin/main")
    parser.add_argument("--env-keys", default="COMPOSE_PROJECT_NAME")
    parser.add_argument("--codex-bin", default="codex")
    parser.add_argument("--space")
    parser.add_argument("--skip-fetch", action="store_true")
    parser.add_argument("--skip-bootstrap", action="store_true")
    parser.add_argument("--focus", action="store_true")
    return parser.parse_args()


def main():
    args = parse_args()
    repo = Path(args.repo).expanduser().resolve()
    worktree = Path(args.worktree).expanduser().resolve()
    prompt_file = Path(args.prompt_file).expanduser().resolve()
    if not prompt_file.exists():
        raise SystemExit(f"missing prompt file: {prompt_file}")
    if not args.skip_fetch:
        run(["git", "fetch", "--prune", "origin", "main"], cwd=repo)
    worktree_state = create_or_reuse_worktree(repo, worktree, args.branch, args.base)
    did_bootstrap = bootstrap(worktree, args.skip_bootstrap)
    env = worktree_env(worktree, {key for key in args.env_keys.split(",") if key})
    tab = launch_tab(worktree, prompt_file, args.codex_bin, args.focus, args.space)
    print(
        json.dumps(
            {
                "issue": args.issue,
                "branch": args.branch,
                "worktree": str(worktree),
                "worktreeState": worktree_state,
                "bootstrapped": did_bootstrap,
                "env": env,
                "tabID": tab.get("tabID"),
                "paneID": tab.get("paneID"),
                "promptFile": str(prompt_file),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
