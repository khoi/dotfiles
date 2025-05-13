#!/usr/bin/env zsh
set -Eeuo pipefail

if ! command -v op &>/dev/null; then
  echo "❌ 1password CLI not found. Please install it first."
  exit 1
fi

RESTIC_PASSWORD_COMMAND="echo $(op read 'op://Personal/vault/restic encryption')"
RESTIC_REPOSITORY="$(op read 'op://Private/vault/restic repo')"

HOST="$(system_profiler SPHardwareDataType | awk '/Serial/ {print $4}')-$(hostname)"

echo "💾 Backing up with hostname $HOST"

restic -r "$RESTIC_REPOSITORY" --password-command "$RESTIC_PASSWORD_COMMAND" unlock
restic \
  --password-command "$RESTIC_PASSWORD_COMMAND" \
  -r "$RESTIC_REPOSITORY" \
  backup "$HOME" \
  -H "$HOST" \
  --compression "max" \
  --exclude-caches \
  --one-file-system \
  --exclude "$HOME/.cache" \
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
