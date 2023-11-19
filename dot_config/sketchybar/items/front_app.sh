#!/usr/bin/env bash

FRONT_APP_SCRIPT='sketchybar --set $NAME label="$INFO"'

front_app=(
  icon.drawing=off
  associated_display=active
  script="$FRONT_APP_SCRIPT"
)

sketchybar --add event window_focus \
  --add event windows_on_spaces \
  --add item front_app left \
  --set front_app "${front_app[@]}" \
  --subscribe front_app front_app_switched
