#!/bin/sh
source "$CONFIG_DIR/colors.sh"

if scutil --nc list | grep "^\*" | grep Connected >>/dev/null; then
    ICON="􀞡"
    ICON_COLOR=$RED
else
    ICON="􀞙"
    ICON_COLOR=$GREEN
fi

sketchybar --set $NAME icon=$ICON icon.color=$ICON_COLOR
