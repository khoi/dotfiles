#!/usr/bin/env zsh

# Load shared icons if available
ICON_FILE_PATH="$HOME/.config/sketchybar/icons.sh"
if [ -f "$ICON_FILE_PATH" ]; then
  source "$ICON_FILE_PATH"
fi

case ${INFO} in
0)
    ICON="${ICONS_VOLUME[1]:-}"
    ICON_PADDING_RIGHT=21
    ;;
[0-9])
    ICON="${ICONS_VOLUME[4]:-}"
    ICON_PADDING_RIGHT=12
    ;;
*)
    ICON="${ICONS_VOLUME[4]:-}"
    ICON_PADDING_RIGHT=6
    ;;
esac

sketchybar --set $NAME icon=$ICON icon.padding_right=$ICON_PADDING_RIGHT label="$INFO%"
