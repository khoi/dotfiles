set fish_greeting

# Initialize Homebrew if it exists
if test -x /opt/homebrew/bin/brew
    eval "$(/opt/homebrew/bin/brew shellenv)"
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
set -Ux FZF_DEFAULT_OPTS "\
--color=bg+:#363A4F,spinner:#F4DBD6,hl:#ED8796 \
--color=fg:#CAD3F5,header:#ED8796,info:#C6A0F6,pointer:#F4DBD6 \
--color=marker:#B7BDF8,fg+:#CAD3F5,prompt:#C6A0F6,hl+:#ED8796 \
--color=selected-bg:#494D64 \
--color=border:#6E738D,label:#CAD3F5"
set -Ux FZF_DEFAULT_COMMAND 'fd --type f --strip-cwd-prefix'
set -Ux FZF_CTRL_T_COMMAND 'fd --type f --hidden --exclude .git --strip-cwd-prefix'

# Aliases
alias o open
alias v nvim
alias vim nvim
alias cat bat
alias nproc "sysctl -n hw.logicalcpu"
alias lg lazygit
alias c cursor
alias ac "claude --dangerously-skip-permissions"
alias ad "codex --dangerously-bypass-approvals-and-sandbox"

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

# PATH
fish_add_path ~/.bin
fish_add_path ~/.local/bin

# Initialize zoxide if installed
if command -v zoxide &>/dev/null
    zoxide init fish | source
end

# Initialize atuin if installed
if command -v atuin &>/dev/null
    atuin init fish | sed 's/-k up/up/' | source # A hack until https://github.com/atuinsh/atuin/issues/2803 is fixed
end

source ~/.orbstack/shell/init2.fish 2>/dev/null || :

if status is-interactive
    # Only configure zellij if it's installed
    if command -v zellij &>/dev/null
        export ZELLIJ_CONFIG_DIR=$HOME/.config/zellij
        if [ "$TERM" = xterm-ghostty ]
            if not set -q ZELLIJ
                zellij attach -c "$USER"
                if test "$ZELLIJ_AUTO_EXIT" = true
                    kill $fish_pid
                end
            end
        end
    end
end
