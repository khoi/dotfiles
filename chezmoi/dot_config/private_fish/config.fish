eval "$(/opt/homebrew/bin/brew shellenv)"

set -g async_prompt_functions _pure_prompt_git

source ~/.config/fish/private_variables.fish

# Global
set -gx EDITOR nvim
set -gx HOMEBREW_NO_ANALYTICS 1
set -gx HOMEBREW_NO_AUTO_UPDATE 1
set -gx HOMEBREW_VERBOSE 1
set -gx GHQ_ROOT ~/Developer/code
set -gx TLDR_AUTO_UPDATE_DISABLED 1
set -gx XDG_CONFIG_HOME ~/.config

# FZF - Catppuccin Mocha theme
set -Ux FZF_DEFAULT_OPTS "\
--color=bg+:#313244,bg:#1E1E2E,spinner:#F5E0DC,hl:#F38BA8 \
--color=fg:#CDD6F4,header:#F38BA8,info:#CBA6F7,pointer:#F5E0DC \
--color=marker:#B4BEFE,fg+:#CDD6F4,prompt:#CBA6F7,hl+:#F38BA8 \
--color=selected-bg:#45475A \
--color=border:#6C7086,label:#CDD6F4"

# Aliases
alias o open
alias v nvim
alias vim nvim
alias cat bat
alias nproc "sysctl -n hw.logicalcpu"
alias lg lazygit
alias c cursor

# PATH
fish_add_path ~/.bin
fish_add_path ~/.local/bin

# Load stuff
zoxide init fish | source

# Added by OrbStack: command-line tools and integration
# This won't be added again if you remove it.
source ~/.orbstack/shell/init2.fish 2>/dev/null || :
