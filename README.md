# dotfiles

My highly opinonated macOS dotfiles. Feel free to look around and copy what you like.

For Linux/Omarchy refers to https://github.com/khoi/omarchy-dotfiles

## Installation

```sh
sh -c "$(curl -fsLS get.chezmoi.io)" -- init --apply khoi
```

## Manual setups

- Setup Karabiner Elements
- Setup GUI app
  - 1Password
    - Turn on SSH Agent
    - Integrate with 1Password CLI
  - Moom
  - Raycast
  - Adguard
- Install xcodes using the CLI (not part of the script since it takes forever)

```sh
xcodes install --latest --select --experimental-unxip
```
