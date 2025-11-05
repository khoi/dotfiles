# When you need to call tools from the shell, **use this rubric**:

- Find Files: `fd`
- Find Text: `rg` (ripgrep)

If ast-grep is available avoid tools `rg` or `grep` unless a plain‑text search is explicitly requested.

- When running long running cli commands or need TTY, run them in `tmux new-session -s {branch_name_name_of_the_session} zsh -l` (the login shell is needed)
