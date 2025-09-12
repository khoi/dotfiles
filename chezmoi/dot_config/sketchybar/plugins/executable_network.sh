#!/usr/bin/env zsh

# Load colors
source "$HOME/.config/sketchybar/colors.sh"

# Debug logging - list all environment variables starting with capital letters
env | grep "^[A-Z]" >> /tmp/network-plugin-env.log
echo "---" >> /tmp/network-plugin-env.log

# Handle network update events from network-stream.sh
if [ "$SENDER" = "network_update" ]; then
    case "$NAME" in
        network.down)
            # Use download_bytes from event to determine color
            BYTES=${DOWNLOAD_BYTES:-0}
            LABEL=${DOWNLOAD:-"000 MB/s"}
            
            # Ensure BYTES is a valid number
            if ! [[ "$BYTES" =~ ^[0-9]+$ ]]; then
                BYTES=0
            fi
            
            # Determine download icon color based on speed
            if [ $BYTES -eq 0 ]; then
                ICON_COLOR=$OVERLAY0  # Gray for idle
            elif [ $BYTES -lt 1000000 ]; then  # < 1MB/s
                ICON_COLOR=$OVERLAY1  # Light gray for low
            elif [ $BYTES -lt 5000000 ]; then  # < 5MB/s
                ICON_COLOR=$GREEN  # Green for medium
            elif [ $BYTES -lt 10000000 ]; then  # < 10MB/s
                ICON_COLOR=$YELLOW  # Yellow for high
            elif [ $BYTES -lt 50000000 ]; then  # < 50MB/s
                ICON_COLOR=$PEACH  # Orange for very high
            else  # >= 50MB/s
                ICON_COLOR=$RED  # Red for extreme
            fi
            
            sketchybar --set $NAME label="$LABEL" icon.color=$ICON_COLOR
            ;;
            
        network.up)
            # Use upload_bytes from event to determine color
            BYTES=${UPLOAD_BYTES:-0}
            LABEL=${UPLOAD:-"000 MB/s"}
            
            # Ensure BYTES is a valid number
            if ! [[ "$BYTES" =~ ^[0-9]+$ ]]; then
                BYTES=0
            fi
            
            # Determine upload icon color based on speed
            if [ $BYTES -eq 0 ]; then
                ICON_COLOR=$OVERLAY0  # Gray for idle
            elif [ $BYTES -lt 1000000 ]; then  # < 1MB/s
                ICON_COLOR=$OVERLAY1  # Light gray for low
            elif [ $BYTES -lt 5000000 ]; then  # < 5MB/s
                ICON_COLOR=$GREEN  # Green for medium
            elif [ $BYTES -lt 10000000 ]; then  # < 10MB/s
                ICON_COLOR=$YELLOW  # Yellow for high
            elif [ $BYTES -lt 50000000 ]; then  # < 50MB/s
                ICON_COLOR=$PEACH  # Orange for very high
            else  # >= 50MB/s
                ICON_COLOR=$RED  # Red for extreme
            fi
            
            sketchybar --set $NAME label="$LABEL" icon.color=$ICON_COLOR
            ;;
    esac
fi