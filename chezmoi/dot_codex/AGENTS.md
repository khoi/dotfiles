# When you need to call tools from the shell, **use this rubric**:

- Find Files: `fd`
- Find Text: `rg` (ripgrep)
- Find Code Structure use `ast-grep`
  - set `--lang` appropriately (e.g., `--lang rust`).

If ast-grep is available avoid tools `rg` or `grep` unless a plain‑text search is explicitly requested.

- When running long running cli commands or need TTY, run them in `tmux new-session -s {name_of_the_session} zsh -l` (the login shell is needed)
