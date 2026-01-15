## What This Is

macOS dotfiles managed by chezmoi. Source of truth is `chezmoi/` (set via `.chezmoiroot`).

## Common Operations

```bash
chezmoi edit --apply <file>        # edit source, triggers apply
chezmoi apply                      # apply dotfiles to home
chezmoi diff                       # preview changes
```

## Structure

- `chezmoi/` - actual dotfiles source (chezmoi root)
  - `.chezmoidata/packages.yaml` - homebrew packages (brews/casks)
  - `.chezmoiscripts/` - install scripts (homebrew, macOS prefs)
  - `dot_*` maps to `~/.*`
  - `private_*` prefix for sensitive files
- `karabiner/` - TypeScript-based Karabiner config generator

## Karabiner Config

```bash
cd karabiner && make       # builds rules.ts → ~/.config/karabiner/karabiner.json, run after changes
```

TypeScript generates JSON config. Hyper key = right_option. Edit `rules.ts` for keybinds.

## Rules

- Always edit the file individually, do not touch or commit changes that't not yours nodifications.
