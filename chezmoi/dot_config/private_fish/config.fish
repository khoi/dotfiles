if status is-interactive
    # Commands to run in interactive sessions can go here
end

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

set -gx RESTIC_REPOSITORY "rest:http://restic:restic@192.168.0.45:8769"
set -gx RESTIC_PASSWORD_COMMAND "op read 'op://Personal/vault/restic encryption'"

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
