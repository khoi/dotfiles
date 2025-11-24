---
name: tmux
description: "Remote control tmux sessions for interactive CLIs (python, gdb, etc.) by sending keystrokes and scraping pane output."
license: Vibecoded
---

# tmux Skill

Use tmux as a programmable terminal multiplexer for interactive work. Works on Linux and macOS with stock tmux using the default socket.

## Quickstart

```bash
SESSION=claude-python                           # slug-like names; avoid spaces
tmux new -d -s "$SESSION" -n shell
tmux send-keys -t "$SESSION":0.0 -- 'python3 -q' Enter
tmux capture-pane -p -J -t "$SESSION":0.0 -S -200  # watch output
tmux kill-session -t "$SESSION"                   # clean up
```

After starting a session ALWAYS tell the user how to monitor the session by giving them a command to copy paste:

```
To monitor this session yourself:
  tmux attach -t claude-lldb

Or to capture the output once:
  tmux capture-pane -p -J -t claude-lldb:0.0 -S -200
```

This must ALWAYS be printed right after a session was started and once again at the end of the tool loop.  But the earlier you send it, the happier the user will be.

## Targeting panes and naming

- Target format: `{session}:{window}.{pane}`, defaults to `:0.0` if omitted. Keep names short (e.g., `claude-py`, `claude-gdb`).
- Inspect: `tmux list-sessions`, `tmux list-panes -a`.

## Finding sessions

- List sessions with metadata: `./tools/find-sessions.sh`; add `-q partial-name` to filter.

## Sending input safely

- Prefer literal sends to avoid shell splitting: `tmux send-keys -t target -l -- "$cmd"`
- When composing inline commands, use single quotes or ANSI C quoting to avoid expansion: `tmux send-keys -t target -- $'python3 -m http.server 8000'`.
- To send control keys: `tmux send-keys -t target C-c`, `C-d`, `C-z`, `Escape`, etc.

## Watching output

- Capture recent history (joined lines to avoid wrapping artifacts): `tmux capture-pane -p -J -t target -S -200`.
- For continuous monitoring, poll with the helper script (below) instead of `tmux wait-for` (which does not watch pane output).
- You can also temporarily attach to observe: `tmux attach -t "$SESSION"`; detach with `Ctrl+b d`.
- When giving instructions to a user, **explicitly print a copy/paste monitor command** alongside the action don't assume they remembered the command.

## Spawning Processes

Some special rules for processes:

- when asked to debug, use lldb by default
- when starting a python interactive shell, always set the `PYTHON_BASIC_REPL=1` environment variable. This is very important as the non-basic console interferes with your send-keys.

## Synchronizing / waiting for prompts

- Use timed polling to avoid races with interactive tools. Example: wait for a Python prompt before sending code:
  ```bash
  ./tools/wait-for-text.sh -t "$SESSION":0.0 -p '^>>>' -T 15 -l 4000
  ```
- For long-running commands, poll for completion text (`"Type quit to exit"`, `"Program exited"`, etc.) before proceeding.

## Interactive tool recipes

- **Python REPL**: `tmux ... send-keys -- 'python3 -q' Enter`; wait for `^>>>`; send code with `-l`; interrupt with `C-c`. Always with `PYTHON_BASIC_REPL`.
- **gdb**: `tmux ... send-keys -- 'gdb --quiet ./a.out' Enter`; disable paging `tmux ... send-keys -- 'set pagination off' Enter`; break with `C-c`; issue `bt`, `info locals`, etc.; exit via `quit` then confirm `y`.
- **Other TTY apps** (ipdb, psql, mysql, node, bash): same pattern—start the program, poll for its prompt, then send literal text and Enter.

## Cleanup

- Kill a session when done: `tmux kill-session -t "$SESSION"`.
- Kill all sessions: `tmux list-sessions -F '#{session_name}' | xargs -r -n1 tmux kill-session -t`.
- Remove everything: `tmux kill-server`.

## Helper: wait-for-text.sh

`./tools/wait-for-text.sh` polls a pane for a regex (or fixed string) with a timeout. Works on Linux/macOS with bash + tmux + grep.

```bash
./tools/wait-for-text.sh -t session:0.0 -p 'pattern' [-F] [-T 20] [-i 0.5] [-l 2000]
```

- `-t`/`--target` pane target (required)
- `-p`/`--pattern` regex to match (required); add `-F` for fixed string
- `-T` timeout seconds (integer, default 15)
- `-i` poll interval seconds (default 0.5)
- `-l` history lines to search from the pane (integer, default 1000)
- Exits 0 on first match, 1 on timeout. On failure prints the last captured text to stderr to aid debugging.