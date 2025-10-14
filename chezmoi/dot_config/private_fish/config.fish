set fish_greeting

eval "$(/opt/homebrew/bin/brew shellenv)"

set -g async_prompt_functions _pure_prompt_git
set -g pure_enable_single_line_prompt false
set -g pure_separate_prompt_on_error true

source ~/.config/fish/private_variables.fish

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
set -Ux FZF_CTRL_T_COMMAND $FZF_DEFAULT_COMMAND

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

zoxide init fish | source

source ~/.orbstack/shell/init2.fish 2>/dev/null || :

if status is-interactive
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
