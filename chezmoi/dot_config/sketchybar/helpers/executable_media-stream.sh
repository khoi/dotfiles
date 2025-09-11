#!/usr/bin/env bash

# Requires: media-control (https://github.com/npyl/media-control or similar)
# Streams media updates and triggers a SketchyBar custom event.

set -euo pipefail

MEDIA_BIN="${MEDIA_BIN:-/opt/homebrew/bin/media-control}"
SKETCHYBAR_BIN="/opt/homebrew/bin/sketchybar"

if ! command -v "$MEDIA_BIN" >/dev/null 2>&1; then
  exit 0
fi

if ! command -v "$SKETCHYBAR_BIN" >/dev/null 2>&1; then
  exit 0
fi

title=""
artist=""
playing="false"

"$MEDIA_BIN" stream | \
while IFS= read -r line; do
  diff=$(jq -r '.diff' <<< "$line")
  
  payload_empty=$(jq -r 'if (.payload | length) == 0 then "true" else "false" end' <<< "$line")
  # empty payload means no media is playing/paused
  if [ "$payload_empty" = "true" ]; then
    title=""
    artist=""
    playing="false"
  else
    new_title=$(jq -r 'if .payload.title then .payload.title else empty end' <<< "$line")
    new_artist=$(jq -r 'if .payload.artist then .payload.artist else empty end' <<< "$line")
    new_playing=$(jq -r 'if .payload.playing != null then .payload.playing else empty end' <<< "$line")
    
    if [ -n "$new_title" ] && [ "$new_title" != "null" ]; then
      title="$new_title"
    fi
    if [ -n "$new_artist" ] && [ "$new_artist" != "null" ]; then
      artist="$new_artist"
    fi
    if [ -n "$new_playing" ] && [ "$new_playing" != "null" ]; then
      playing="$new_playing"
    fi
  fi

  echo "title: $title, artist: $artist, playing: $playing"
  $SKETCHYBAR_BIN --trigger media_stream_changed title="$title" artist="$artist" playing="$playing"
done

