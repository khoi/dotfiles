#!/usr/bin/env zsh
set -Eeuo pipefail

source "$HOME/.config/restic/hetzner.zsh"

restic unlock

echo "🧠 Forgetting extra backups"
restic \
  forget \
  --keep-within-daily 7d \
  --keep-within-weekly 1m \
  --keep-within-monthly 1y \
  --keep-within-yearly 100y

echo "🧹 Pruning"
restic \
  prune
