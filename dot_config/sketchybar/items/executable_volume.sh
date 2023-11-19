#!/usr/bin/env bash

SOUND=(
    script="$PLUGIN_DIR/volume.sh"
    update_freq=60
)

sketchybar --add item sound right
sketchybar --set sound "${SOUND[@]}"

sketchybar --subscribe sound volume_change