# When you need to call tools from the shell, **use this rubric**:

- Find Files: `fd`
- Find Text: `rg` (ripgrep)
- Find Code Structure use `ast-grep`
  - set `--lang` appropriately (e.g., `--lang rust`).

If ast-grep is available avoid tools `rg` or `grep` unless a plain‑text search is explicitly requested.

- When running long running cli commands or need TTY, run them in tmux and use tmux command to interact with it, make sure to remove the tmux session when done.
