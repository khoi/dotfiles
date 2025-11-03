#!/bin/bash

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
    if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
        cd "${WORKTREE_PATH}"
    else
        echo "${WORKTREE_PATH}"
    fi
else
    exit 1
fi
