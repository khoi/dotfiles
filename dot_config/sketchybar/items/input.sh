#!/bin/sh

sketchybar --add event input_change 'AppleSelectedInputSourcesChangedNotification' \
           --add item language right \
           --set language script="$PLUGIN_DIR/input_source.sh" \
           --subscribe language input_change