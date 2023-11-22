#!/usr/bin/env zsh

set -Eeuo pipefail

restic unlock

echo "💾 Backing up"
restic backup "$HOME" \
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
  --exclude "$HOME/.Trash"
