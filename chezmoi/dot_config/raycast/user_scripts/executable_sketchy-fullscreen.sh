#!/bin/bash

# Required parameters:
# @raycast.schemaVersion 1
# @raycast.title Sketchy Fullscreen
# @raycast.mode silent

# Optional parameters:
# @raycast.icon 🤖

# Documentation:
# @raycast.author khoiracle
# @raycast.authorURL https://raycast.com/khoiracle

# This is used to determine if a monitor is used
# Since the notch is -only- on the laptop, if a monitor isn't used,
# then that means the internal display is used ¯\_(ツ)_/¯
MAIN_DISPLAY=$(system_profiler SPDisplaysDataType | grep -B 3 'Main Display:' | awk '/Display Type/ {print $3}')

if [[ $MAIN_DISPLAY = "Built-in" ]]; then
    # MacBook display is main - use regular maximize
    open -g "raycast://extensions/raycast/window-management/maximize"
else
    # External display is main - use custom fullscreen with padding
    open -g "raycast://customWindowManagementCommand?&name=Fullscreen%20Padding%20Top%20Bar&position=topLeft&absoluteWidth=9999.0&absoluteHeight=99999.0&absoluteYOffset=32.0"
fi

