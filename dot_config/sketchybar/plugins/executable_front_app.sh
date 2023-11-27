#!/bin/bash
WINDOW_TITLE=$(yabai -m query --windows --window | jq -r '.title')

if [[ $WINDOW_TITLE = "" ]]; then
  WINDOW_TITLE=$INFO
fi

if [[ ${#WINDOW_TITLE} -gt 50 ]]; then
  WINDOW_TITLE=$(echo "$WINDOW_TITLE" | cut -c 1-50)
  sketchybar -m --set title label="│ $WINDOW_TITLE"…
  exit 0
fi

if [ "$SENDER" = "front_app_switched" ] || [ "$SENDER" = "window_focus" ]; then
  sketchybar --set $NAME label="$WINDOW_TITLE" icon.background.image="app.$INFO"
fi
