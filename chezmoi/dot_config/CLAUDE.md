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

