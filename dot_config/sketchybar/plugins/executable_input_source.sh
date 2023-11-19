#!/usr/bin/env bash

INPUT_MODE=$(defaults read ~/Library/Preferences/com.apple.HIToolbox.plist AppleSelectedInputSources | grep -m1 "Input Mode" | cut -d'"' -f4)

ICON="🇺🇸"

if [[ $INPUT_MODE == "com.apple.inputmethod.VietnameseSimpleTelex" ]]; then
  ICON="🇻🇳"
fi

sketchybar --set $NAME icon="$ICON" icon.y_offset=1 icon.padding_right=0 label.drawing=off
