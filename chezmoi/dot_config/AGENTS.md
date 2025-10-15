## Repository Overview

This is a user configuration directory (`~/.config`) containing dotfiles and configurations for various development tools and applications on macOS. The configurations are managed using chezmoi for version control and synchronization.

## Key Configuration Directories

### Development Environments

- **nvim/** - Neovim configuration using LazyVim framework
  - Plugins located in `nvim/lua/plugins/`
  - LazyVim auto-installs plugins on first run
- **cursor/** - Cursor editor configuration (JSON format)
- **zed/** - Zed editor configuration with `settings.json` and `keymap.json`

### Terminal and Shell

- **fish/** - Fish shell configuration
  - `config.fish` - Main configuration with aliases and environment variables
  - `functions/` - Custom fish functions
  - `private_variables.fish` - Sensitive environment variables (not tracked)
- **ghostty/** - Terminal emulator configuration (auto-attaches to Zellij)
- **zellij/** - Terminal multiplexer configuration
- **starship.toml** - Cross-shell prompt configuration

### Development Tools

- **git/** - Git configuration
- **gh/** and **gh-copilot/** - GitHub CLI with Copilot extension
- **lazygit/** - TUI for git operations
- **btop/** - System monitoring tool
- **chezmoi/** - Dotfiles management tool configuration
- **mise/** - Development environment version manager

### Other Tools

- **yazi/** - Terminal file manager
- **cheat/** - Command-line cheatsheet tool
- **raycast/** - macOS productivity tool configuration
- **karabiner/** - Keyboard customization

## Common Development Commands

### Managing Dotfiles with chezmoi

This configuration is managed with [chezmoi](https://www.chezmoi.io/). Commands:

- `chezmoi add <file>` - Add new or modified files to chezmoi management
- `chezmoi diff` - Review changes before applying
- `chezmoi apply` - Apply changes from source to home directory
- `chezmoi status` - Show status of managed files
- `chezmoi update` - Pull latest changes and apply them
- `chezmoi destroy` - Destroy, forget a managed file

**Important**: Never add sensitive files (API keys, private variables, `.env`, etc.) to chezmoi

### Private Configuration

- Fish sources `~/.config/fish/private_variables.fish` for sensitive environment variables
- This file is NOT tracked and should never be added to chezmoi
- Keep API keys, tokens, and credentials in private files only

## Theming

When changing theme clone git@github.com:basecamp/omarchy.git to /tmp and look into its themes folder for reference.

### Components that support theming:

- **Neovim** - LazyVim theme configuration in `nvim/lua/plugins/custom.lua`
- **Zed** - Theme in `zed/settings.json`
- **Cursor** - Theme in Library/Application Support/Cursor/User/settings.json
- **Ghostty** - Terminal theme in `ghostty/config`
- **Zellij** - Terminal multiplexer theme in `zellij/config.kdl` and `zellij/layouts/default.kdl`
- **LazyGit** - Git TUI theme in `lazygit/config.yml`
- **btop** - System monitor theme in `btop/btop.conf`
- **Fish/FZF** - FZF color scheme in `fish/config.fish` (Catppuccin Macchiato colors)
