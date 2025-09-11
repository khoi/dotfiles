#!/usr/bin/env zsh

# Load shared icons if available
ICON_FILE_PATH="$HOME/.config/sketchybar/icons.sh"
if [ -f "$ICON_FILE_PATH" ]; then
    source "$ICON_FILE_PATH"
fi

update_space() {
    SPACE_ID=$(echo "$INFO" | jq -r '."display-1"')

    case $SPACE_ID in
    [1-9])
        # Use icons array if defined for spaces, else fall back to numeric
        ICON_CANDIDATE="${ICONS_SPACE[$SPACE_ID]}"
        if [ -n "$ICON_CANDIDATE" ]; then
            ICON="$ICON_CANDIDATE"
            ICON_PADDING_LEFT=7
            ICON_PADDING_RIGHT=7
        else
            ICON=$SPACE_ID
            ICON_PADDING_LEFT=9
            ICON_PADDING_RIGHT=10
        fi
        ;;
    *)
        ICON=$SPACE_ID
        ICON_PADDING_LEFT=9
        ICON_PADDING_RIGHT=10
        ;;
    esac

    sketchybar --set $NAME \
        icon=$ICON \
        icon.padding_left=$ICON_PADDING_LEFT \
        icon.padding_right=$ICON_PADDING_RIGHT
}

case "$SENDER" in
"mouse.clicked")
    # Reload sketchybar
    sketchybar --remove '/.*/'
    source $HOME/.config/sketchybar/sketchybarrc
    ;;
*)
    update_space
    ;;
esac
