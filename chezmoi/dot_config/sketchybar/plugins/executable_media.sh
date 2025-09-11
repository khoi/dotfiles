#!/usr/bin/env bash

# media.sh — updates the media item label from env vars

NAME="$1"

# When triggered via custom event, SketchyBar passes env via $INFO or env
TITLE="${title:-${TITLE:-}}"
ARTIST="${artist:-${ARTIST:-}}"

# Maximum length for title and artist
MAX_LENGTH=30

# Trim function
trim_text() {
  local text="$1"
  local max_len="$2"
  if [[ ${#text} -gt $max_len ]]; then
    echo "${text:0:$((max_len - 3))}..."
  else
    echo "$text"
  fi
}

if [[ -n "$ARTIST" || -n "$TITLE" ]]; then
  # Trim title and artist if too long
  TITLE=$(trim_text "$TITLE" "$MAX_LENGTH")
  ARTIST=$(trim_text "$ARTIST" "$MAX_LENGTH")

  if [[ -n "$ARTIST" && -n "$TITLE" ]]; then
    LABEL="$TITLE - $ARTIST"
  else
    LABEL="$TITLE - $ARTIST"
  fi
  sketchybar --set "${NAME:-media}" label="$LABEL" label.drawing=on
else
  # No data yet: hide label
  sketchybar --set "${NAME:-media}" label="" label.drawing=off
fi

case "$SENDER" in
mouse.clicked)
  # Placeholder: could open the player or toggle play/pause via media-control
  :
  ;;
esac
