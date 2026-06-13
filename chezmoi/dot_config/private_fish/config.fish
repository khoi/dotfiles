set fish_greeting

set -l onepassword_ssh_agent_sock "$HOME/Library/Group Containers/2BUA8C4S2C.com.1password/t/agent.sock"
if test -S "$onepassword_ssh_agent_sock"
    set -gx SSH_AUTH_SOCK "$onepassword_ssh_agent_sock"
end

if not status is-interactive
    return
end

set -g async_prompt_functions _pure_prompt_git
set -g pure_enable_single_line_prompt false
set -g pure_separate_prompt_on_error true

if test -f ~/.config/fish/private_variables.fish
    source ~/.config/fish/private_variables.fish
end

set -gx EDITOR nvim
set -gx TLDR_AUTO_UPDATE_DISABLED 1

set -gx FZF_DEFAULT_COMMAND 'fd --type f --hidden --exclude .git --strip-cwd-prefix'
set -gx FZF_CTRL_T_COMMAND 'fd --type f --hidden --exclude .git --strip-cwd-prefix'

if command -v fzf &>/dev/null
    set -l fzf_cache "$HOME/.cache/fzf_init.fish"
    if not test -f $fzf_cache; or test (command -v fzf) -nt $fzf_cache
        fzf --fish >$fzf_cache
    end
    source $fzf_cache
end

abbr -a o open
abbr -a v nvim
abbr -a lg lazygit
abbr -a ac "claude --dangerously-skip-permissions"
abbr -a acf "claude --dangerously-skip-permissions --resume --fork-session"
abbr -a ad codex
abbr -a adf "codex --profile fast"
abbr -a ads "codex --profile slow"

command -v nvim &>/dev/null && alias vim nvim
command -v bat &>/dev/null && alias cat bat
alias nproc "sysctl -n hw.logicalcpu"

bind \cf forward-word
bind \ce end-of-line
bind ctrl-g edit_command_buffer

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

if not contains -- "/Users/khoi/.supacode/hooks/bin/" $PATH
  set -gx PATH "/Users/khoi/.supacode/hooks/bin/" $PATH
end

fish_add_path /Users/khoi/.opencode/bin
