#!/usr/bin/env bash

source "$CONFIG_DIR/colors.sh"

CONFIG=(
  update_freq=60
  script="$PLUGIN_DIR/crypto.sh"
  icon.highlight="on"
  icon.highlight_color="$YELLOW"
)

sketchybar --add item crypto right
sketchybar --set crypto "${CONFIG[@]}"