#!/usr/bin/env zsh
set -Eeuo pipefail

source "$HOME/.config/restic/hetzner.zsh"

HOST="$(system_profiler SPHardwareDataType | awk '/Serial/ {print $4}')-$(hostname)"

printf '💾 Backing up with hostname %s to "%s"\n' "$HOST" "$RESTIC_REPOSITORY"

restic unlock
restic \
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
  --exclude "$HOME/OrbStack" \
  --exclude "$HOME/.ollama/" \
  "$@"

"$HOME/.bin/restic_maintain.sh"
