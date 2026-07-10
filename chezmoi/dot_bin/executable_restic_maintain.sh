#!/usr/bin/env zsh

set -Eeuo pipefail

if ! command -v op &>/dev/null; then
  echo "❌ 1password CLI not found. Please install it first."
  exit 1
fi

RESTIC_PASSWORD_COMMAND="echo $(op read 'op://Personal/vault/restic encryption')"
RESTIC_REPOSITORY="$(op read 'op://Personal/vault/restic repo')"

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
