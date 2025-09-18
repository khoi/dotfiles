# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a user configuration directory (`~/.config`) containing dotfiles and configurations for various development tools and applications on macOS.

## Key Configuration Directories

### Development Environments

- **nvim/** - Neovim configuration using LazyVim framework
- **emacs/** and **doom/** - Emacs configurations with Doom Emacs
- **cursor/** - Cursor editor configuration
- **zed/** - Zed editor configuration with settings and keymaps

### Terminal and Shell

- **alacritty/** - Terminal emulator with theme configurations
- **fish/** - Fish shell configuration
- **starship.toml** - Cross-shell prompt configuration
- **ghostty/** - Terminal configuration

### Development Tools

- **git/** - Git configuration
- **gh/** and **gh-copilot/** - GitHub CLI configurations
- **lazygit/** and **gitui/** - Git UI tools
- **btop/** and **htop/** - System monitoring tools

## Working with Configurations

When modifying configuration files:

1. Check existing patterns in the specific config directory
2. Preserve the existing format (TOML, JSON, Lua, etc.)
3. For Neovim configs, follow LazyVim conventions
4. For theme files, maintain consistency with existing theme structures

## Common Development Commands

### Managing Dotfiles with chezmoi

This repository is managed with [chezmoi](https://www.chezmoi.io/). After making modifications:

- `chezmoi add <file>` - Add new or modified files to chezmoi management
- `chezmoi diff` - Review changes before applying
- `chezmoi apply` - Apply changes from source to home directory
- `chezmoi destroy` - Remove files from chezmoi management

**Important**: Do not add files that shouldn't be in dotfiles (secrets, API keys, large files, etc.)

### Editor Configuration Testing

- **Neovim**: `nvim` (LazyVim will auto-install plugins on first run)
- **Fish shell**: `fish` then `source ~/.config/fish/config.fish` to reload
- **Alacritty**: Changes to `alacritty.toml` apply automatically
- **Zed**: Restart Zed after modifying `settings.json` or `keymap.json`

## Architecture Notes

### Configuration Management

The directory uses a mix of configuration formats:

- **TOML**: Alacritty, Starship, mise configurations
- **JSON**: Zed, Cursor, various tool configs
- **Lua**: Neovim (LazyVim), WezTerm configurations
- **Fish**: Shell functions and completions in fish/

### Key Integration Points

1. **Shell Environment**: Fish shell integrates with:

   - Zoxide for directory jumping
   - Starship for prompt
   - Homebrew environment setup
   - Zellij terminal multiplexer (auto-attaches in Ghostty)

2. **Editor Ecosystem**:

   - Neovim uses LazyVim framework with plugins in `nvim/lua/plugins/`
   - Common editor configurations share similar keybindings where possible

3. **Git Workflows**: Multiple git tools configured:
   - Native git config in `git/`
   - LazyGit for TUI interface
   - GitHub CLI (`gh`) with Copilot extension

### Private Configuration

- Fish sources `~/.config/fish/private_variables.fish` for sensitive environment variables
- This file is NOT tracked and should never be added to chezmoi
