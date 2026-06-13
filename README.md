# dotfiles

My highly opinonated macOS dotfiles. Feel free to look around and copy what you like.

For Linux/Omarchy refers to https://github.com/khoi/omarchy-dotfiles

## Installation

```sh
sh -c "$(curl -fsLS get.chezmoi.io)" -- init --apply --use-builtin-git=true khoi
```

## Manual setup

- GUI apps and fonts are installed from `~/.Brewfile`
- 1Password
  - Turn on SSH Agent
  - Integrate with 1Password CLI
- Raycast
  - Disable Spotlight
- Install xcodes using the CLI (not part of the script since it takes forever)

```sh
xcodes install --latest --select --experimental-unxip
```
