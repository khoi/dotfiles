## What This Is

macOS dotfiles managed by chezmoi. Source of truth is `chezmoi/` (set via `.chezmoiroot`).

## Common Operations

```bash
chezmoi apply <target>             # always apply individual files, never all
chezmoi diff                       # preview changes
```

## Structure

- `chezmoi/` - actual dotfiles source (chezmoi root)
  - `.chezmoidata/packages.yaml` - homebrew packages (brews/casks)
  - `.chezmoiscripts/` - install scripts (homebrew, macOS prefs)
  - `dot_*` maps to `~/.*`
  - `private_*` prefix for sensitive files

## Rules

- Always edit the file individually, do not touch or commit changes that't not yours nodifications.
- After apply success, commit the files
