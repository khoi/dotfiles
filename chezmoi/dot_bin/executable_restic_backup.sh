#!/usr/bin/env zsh

set -Eeuo pipefail

HOST="$(system_profiler SPHardwareDataType | awk '/Serial/ {print $4}')"

restic unlock

echo "💾 Backing up with hostname $HOST"

restic backup "$HOME" \
  -H "$HOST" \
  --compression "max" \
  --exclude-caches \
  --one-file-system \
  --exclude "$HOME/Downloads" \
  --exclude "$HOME/Library" \
  --exclude "$HOME/Parallels" \
  --exclude "$HOME/Pictures" \
  --exclude "$HOME/Movies" \
  --exclude "$HOME/Documents" \
  --exclude "$HOME/Music" \
  --exclude "$HOME/.Trash" \
  --exclude "$HOME/.orbstack/" \
  --exclude "$HOME/.ollama/"
