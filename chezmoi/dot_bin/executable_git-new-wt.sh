#!/bin/bash

# Detect if we're inside a worktree and back out to main if needed
GIT_DIR=$(git rev-parse --git-dir 2>/dev/null)
if [[ "$GIT_DIR" == *"/worktrees/"* ]]; then
    # We're in a worktree, find the main worktree location
    MAIN_WORKTREE=$(git worktree list --porcelain | grep -m 1 "^worktree" | cut -d' ' -f2)
    cd "$MAIN_WORKTREE"
fi

if [ -f /usr/share/dict/words ]; then
    WORD=$(sort -R /usr/share/dict/words | head -n 1 | tr '[:upper:]' '[:lower:]' | tr -d "'")
else
    WORD=$(LC_ALL=C tr -dc 'a-z' < /dev/urandom | head -c 8)
fi

mkdir -p .worktrees

WORKTREE_PATH=".worktrees/${WORD}"
BRANCH_NAME="wt/${WORD}"

git worktree add -b "${BRANCH_NAME}" "${WORKTREE_PATH}" >/dev/null 2>&1

if [ $? -eq 0 ]; then
    # Get absolute path of the worktree
    ABSOLUTE_PATH="$(pwd)/${WORKTREE_PATH}"

    if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
        cd "${ABSOLUTE_PATH}"
    else
        echo "${ABSOLUTE_PATH}"
    fi
else
    exit 1
fi
