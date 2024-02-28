#!/usr/bin/env zsh

set -Eeuo pipefail

op document get .zsh_history --force -o ~/.zsh_history
