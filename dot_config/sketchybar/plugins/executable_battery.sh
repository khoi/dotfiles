#!/usr/bin/env bash

source "$CONFIG_DIR/colors.sh"

PERCENTAGE="$(pmset -g batt | grep -Eo "\d+%" | cut -d% -f1)"
CHARGING=$(pmset -g batt | grep 'AC Power')
TIME_TO_FULL=$(ioreg -rw0 -c AppleSmartBattery | grep 'AvgTimeToFull' | cut -d'=' -f2 | xargs)

LABEL="$PERCENTAGE%"

if [ $PERCENTAGE = "" ]; then
  exit 0
fi

case ${PERCENTAGE} in
9[0-9] | 100)
  ICON="􀛨" ICON_HIGHLIGHT_COLOR="$ICON_COLOR"
  ;;
[6-8][0-9])
  ICON="􀺸" ICON_HIGHLIGHT_COLOR="$ICON_COLOR"
  ;;
[3-5][0-9])
  ICON="􀺶" ICON_HIGHLIGHT_COLOR="$ICON_COLOR"
  ;;
[1-2][0-9])
  ICON="􀛩" ICON_HIGHLIGHT_COLOR="$RED"
  ;;
*) ICON="􀛪" ICON_HIGHLIGHT_COLOR="$ICON_COLOR" ;;
esac

if [[ $CHARGING != "" ]]; then
  ICON="􀫮"
  ICON_HIGHLIGHT_COLOR="$GREEN"
  LABEL="$PERCENTAGE%($(($TIME_TO_FULL))m)"
fi

# The item invoking this script (name $NAME) will get its icon and label
# updated with the current battery status
sketchybar --set $NAME icon="$ICON" icon.highlight=on icon.highlight_color="$ICON_HIGHLIGHT_COLOR" label="$LABEL"
