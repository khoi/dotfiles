#!/usr/bin/env sh

# Load color scheme
source "$HOME/.config/sketchybar/colors.sh"

# Battery is here bcause the ICON_COLOR doesn't play well with all background colors

PERCENTAGE=$(pmset -g batt | grep -Eo "\d+%" | cut -d% -f1)
CHARGING=$(pmset -g batt | grep 'AC Power')

if [ $PERCENTAGE = "" ]; then
    exit 0
fi

case ${PERCENTAGE} in
[8-9][0-9] | 100)
    ICON=""
    ICON_COLOR=$COLOR_BATTERY_FULL
    ;;
7[0-9])
    ICON=""
    ICON_COLOR=$COLOR_BATTERY_HIGH
    ;;
[4-6][0-9])
    ICON=""
    ICON_COLOR=$COLOR_BATTERY_MEDIUM
    ;;
[1-3][0-9])
    ICON=""
    ICON_COLOR=$COLOR_BATTERY_LOW
    ;;
[0-9])
    ICON=""
    ICON_COLOR=$COLOR_BATTERY_CRITICAL
    ;;
esac

if [[ $CHARGING != "" ]]; then
    ICON=""
    ICON_COLOR=$COLOR_BATTERY_HIGH
fi

sketchybar --set $NAME \
    icon=$ICON \
    label="${PERCENTAGE}%" \
    icon.color=${ICON_COLOR}
