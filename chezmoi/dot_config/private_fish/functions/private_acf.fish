function acf --description "Resume claude session with fzf picker"
    set -l session_id (~/.bin/claude-sessions | fzf --with-nth=3.. | awk '{print $1}')
    test -n "$session_id" && claude --dangerously-skip-permissions --resume $session_id
end
