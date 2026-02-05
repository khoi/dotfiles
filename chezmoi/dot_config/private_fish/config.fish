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
set -gx GJ_ROOT ~/Developer/code
set -gx TLDR_AUTO_UPDATE_DISABLED 1
set -gx XDG_CONFIG_HOME ~/.config

set -gx FZF_DEFAULT_COMMAND 'fd --type f --hidden --exclude .git --strip-cwd-prefix'
set -gx FZF_CTRL_T_COMMAND 'fd --type f --hidden --exclude .git --strip-cwd-prefix'

# FZF shell integration (cached)
if command -v fzf &>/dev/null
    set -l fzf_cache "$HOME/.cache/fzf_init.fish"
    if not test -f $fzf_cache; or test (command -v fzf) -nt $fzf_cache
        fzf --fish >$fzf_cache
    end
    source $fzf_cache
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

# PATH (validate directories exist)
test -d ~/.bin && fish_add_path ~/.bin
test -d ~/.local/bin && fish_add_path ~/.local/bin
test -d ~/.bun/bin && fish_add_path ~/.bun/bin

# Keybindings
bind \cf forward-word # Ctrl+F: accept one word of autosuggestion
bind \ce end-of-line # Ctrl+E: accept full autosuggestion

# Initialize zoxide (cached)
if command -v zoxide &>/dev/null
    set -l zoxide_cache "$HOME/.cache/zoxide_init.fish"
    if not test -f $zoxide_cache; or test (command -v zoxide) -nt $zoxide_cache
        zoxide init fish >$zoxide_cache
    end
    source $zoxide_cache
end

source ~/.orbstack/shell/init2.fish 2>/dev/null || :
abbr -a fd 'fd -HI'

if command -v gj &>/dev/null
    function gj --wraps gj --description 'gj wrapper that auto-cds on get'
        if test (count $argv) -ge 1 && test "$argv[1]" = get
            set -l dest (command gj $argv)
            and test -d "$dest"
            and cd "$dest"
        else
            command gj $argv
        end
    end
end
