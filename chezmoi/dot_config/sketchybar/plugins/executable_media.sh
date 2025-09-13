#!/usr/bin/env bash

# media.sh — updates the media item label from env vars

NAME="$1"

# Source icons
source "$HOME/.config/sketchybar/icons.sh"

# When triggered via custom event, SketchyBar passes env via $INFO or env
TITLE="${title:-${TITLE:-}}"
ARTIST="${artist:-${ARTIST:-}}"
PLAYING="${playing:-${PLAYING:-}}"

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

# Determine icon based on state
if [[ -n "$ARTIST" || -n "$TITLE" ]]; then
  # Media is available - check if playing or paused
  if [[ "$PLAYING" == "true" ]]; then
    ICON="$ICON_PLAY"
  else
    ICON="$ICON_PAUSE"
  fi
  
  # Trim title and artist if too long
  TITLE=$(trim_text "$TITLE" "$MAX_LENGTH")
  ARTIST=$(trim_text "$ARTIST" "$MAX_LENGTH")

  if [[ -n "$ARTIST" && -n "$TITLE" ]]; then
    LABEL="$TITLE - $ARTIST"
  else
    LABEL="$TITLE - $ARTIST"
  fi
  sketchybar --set "${NAME:-media}" icon="$ICON" label="$LABEL" label.drawing=on
else
  # No media - show music icon
  sketchybar --set "${NAME:-media}" icon="$ICON_MUSIC" label="" label.drawing=off
fi

case "$SENDER" in
mouse.clicked)
  # Placeholder: could open the player or toggle play/pause via media-control
  :
  ;;
esac
