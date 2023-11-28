#!/bin/sh
source "$CONFIG_DIR/colors.sh"

if scutil --nc list | grep "^\*" | grep Connected >>/dev/null; then
    ICON="􀞙"
    ICON_COLOR=$GREEN
else
    ICON="􀞡"
    ICON_COLOR=$RED
fi

sketchybar --set $NAME icon=$ICON icon.color=$ICON_COLOR
