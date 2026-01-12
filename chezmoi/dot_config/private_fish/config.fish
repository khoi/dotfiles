set fish_greeting

# Initialize Homebrew if it exists
if test -x /opt/homebrew/bin/brew
    eval "$(/opt/homebrew/bin/brew shellenv)"
end

# Exit early for non-interactive shells
if not status is-interactive
    return
end

set -g async_prompt_functions _pure_prompt_git
set -g pure_enable_single_line_prompt false
set -g pure_separate_prompt_on_error true

# Source private variables if the file exists
if test -f ~/.config/fish/private_variables.fish
    source ~/.config/fish/private_variables.fish
end

# Global
set -gx EDITOR nvim
set -gx HOMEBREW_NO_ANALYTICS 1
set -gx HOMEBREW_NO_AUTO_UPDATE 1
set -gx HOMEBREW_VERBOSE 1
set -gx GHQ_ROOT ~/Developer/code
set -gx TLDR_AUTO_UPDATE_DISABLED 1
set -gx XDG_CONFIG_HOME ~/.config

# FZF - Catppuccin Macchiato theme
set -gx FZF_DEFAULT_OPTS "\
--color=bg+:#363A4F,spinner:#F4DBD6,hl:#ED8796 \
--color=fg:#CAD3F5,header:#ED8796,info:#C6A0F6,pointer:#F4DBD6 \
--color=marker:#B7BDF8,fg+:#CAD3F5,prompt:#C6A0F6,hl+:#ED8796 \
--color=selected-bg:#494D64 \
--color=border:#6E738D,label:#CAD3F5"
set -gx FZF_DEFAULT_COMMAND 'fd --type f --hidden --exclude .git --strip-cwd-prefix'
set -gx FZF_CTRL_T_COMMAND 'fd --type f --hidden --exclude .git --strip-cwd-prefix'

# FZF shell integration (Ctrl+R history, Ctrl+T files, Alt+C cd)
if command -v fzf &>/dev/null
    fzf --fish | source
end

# Abbreviations (expand in-place)
abbr -a o open
abbr -a v nvim
abbr -a lg lazygit
abbr -a c cursor
abbr -a ac "claude --dangerously-skip-permissions"
abbr -a acf "claude --dangerously-skip-permissions --resume --fork-session"
abbr -a ad codex

# Aliases (command replacements)
command -v nvim &>/dev/null && alias vim nvim
command -v bat &>/dev/null && alias cat bat
alias nproc "sysctl -n hw.logicalcpu"

# eza aliases (if available)
if command -v eza &>/dev/null
    alias ls 'eza --color=always --group-directories-first --icons'
    alias ll 'eza -la --octal-permissions --group-directories-first --icons'
    alias l 'eza -bGF --header --git --color=always --group-directories-first --icons'
    alias lm 'eza -bGF --header --git --color=always --group-directories-first --icons --sort=modified'
    alias la 'eza --long --all --group --group-directories-first --icons'
    alias lx 'eza -lbhHigUmuSa@ --time-style=long-iso --git --color-scale --color=always --group-directories-first --icons'
    alias lS 'eza -1 --color=always --group-directories-first --icons'
    alias lt 'eza --tree --level=2 --color=always --group-directories-first --icons'
    alias l. "eza -a | grep -E '^\.'"
end

# PATH (validate directories exist)
test -d ~/.bin && fish_add_path ~/.bin
test -d ~/.local/bin && fish_add_path ~/.local/bin
test -d ~/.bun/bin && fish_add_path ~/.bun/bin

# Keybindings
bind \cf forward-word # Ctrl+F: accept one word of autosuggestion
bind \ce end-of-line # Ctrl+E: accept full autosuggestion

# Initialize zoxide if installed
if command -v zoxide &>/dev/null
    zoxide init fish | source
end

source ~/.orbstack/shell/init2.fish 2>/dev/null || :
abbr -a fd 'fd -HI'
