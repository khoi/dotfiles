## What This Is

macOS dotfiles managed by chezmoi. Source of truth is `chezmoi/` (set via `.chezmoiroot`).

## Common Operations

```bash
chezmoi apply <target>             # always apply individual files, never all
chezmoi diff                       # preview changes
mise bootstrap                     # install tools, packages, apps, and the login shell
```

## Structure

- `chezmoi/` - actual dotfiles source (chezmoi root)
  - `dot_config/mise/config.toml` - mise tools, formulae, casks, and user bootstrap
  - `.chezmoiscripts/` - mise bootstrap orchestration and macOS prefs
  - `dot_*` maps to `~/.*`
  - `private_*` prefix for sensitive files

## Rules

- Always edit files individually. Do not touch or commit changes that are not yours.
- After a successful apply, commit the files.
