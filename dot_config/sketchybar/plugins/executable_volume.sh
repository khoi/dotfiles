#!/usr/bin/env bash

VOLUME=$(osascript -e "output volume of (get volume settings)")
MUTED=$(osascript -e "output muted of (get volume settings)")
CURRENT_INPUT_UID="$(SwitchAudioSource -f json -c | jq -r '.uid')"

if [[ $MUTED != "false" ]]; then
    ICON="􀊢"
    VOLUME=0
else
    case ${VOLUME} in
        100) ICON="􀊨" ;;
        [7-9][0-9]) ICON="􀊨" ;;
        [3-6][0-9]) ICON="􀊦" ;;
        [1-2][0-9]|[1-9]) ICON="􀊤" ;;
        *) ICON="􀽆"
    esac
fi

if [[ $CURRENT_INPUT_UID != "BuiltInSpeakerDevice" ]]; then
    ICON="􀪷"
fi

sketchybar -m \
    --set $NAME icon="$ICON" \
    --set $NAME label="$VOLUME%"