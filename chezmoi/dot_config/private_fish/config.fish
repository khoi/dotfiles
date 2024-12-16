if status is-interactive
    # Commands to run in interactive sessions can go here
end

eval "$(/opt/homebrew/bin/brew shellenv)"

fzf_configure_bindings --directory=\cf

set -g async_prompt_functions _pure_prompt_git
