#!/usr/bin/env zsh

set -Eeuo pipefail

if ! command -v op &>/dev/null; then
  echo "❌ 1password CLI not found. Please install it first."
  exit 1
fi

OP_ACCOUNT="my.1password.com"
RESTIC_PASSWORD_COMMAND="op read --account $OP_ACCOUNT op://Personal/Restic/password"
RESTIC_REPOSITORY="$(op read --account "$OP_ACCOUNT" op://Personal/Restic/repository)"

restic -r "$RESTIC_REPOSITORY" --password-command "$RESTIC_PASSWORD_COMMAND" unlock

echo "🧠 Forgetting extra backups"
restic \
  --password-command "$RESTIC_PASSWORD_COMMAND" \
  -r "$RESTIC_REPOSITORY" \
  forget \
  --keep-within-daily 7d \
  --keep-within-weekly 1m \
  --keep-within-monthly 1y \
  --keep-within-yearly 100y

echo "🧹 Pruning"
restic \
  --password-command "$RESTIC_PASSWORD_COMMAND" \
  -r "$RESTIC_REPOSITORY" \
  prune
