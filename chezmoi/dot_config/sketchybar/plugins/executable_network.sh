#!/usr/bin/env zsh

# Load colors
source "$HOME/.config/sketchybar/colors.sh"

# Cache file to store previous values for rate calculation
CACHE_FILE="/tmp/sketchybar_network_cache"

# Get current network stats
get_network_stats() {
    # Get bytes for all network interfaces
    local in_bytes=$(netstat -ibn | grep -v "Name" | awk '{sum+=$7} END {print sum}')
    local out_bytes=$(netstat -ibn | grep -v "Name" | awk '{sum+=$10} END {print sum}')
    echo "$in_bytes $out_bytes"
}

# Format bytes to human readable with 1 decimal place
format_bytes() {
    local bytes=$1
    if [ $bytes -lt 1024 ]; then
        echo "${bytes}B"
    elif [ $bytes -lt 1048576 ]; then
        printf "%.1fK" $(echo "scale=1; $bytes / 1024" | bc)
    elif [ $bytes -lt 1073741824 ]; then
        printf "%.1fM" $(echo "scale=1; $bytes / 1048576" | bc)
    else
        printf "%.1fG" $(echo "scale=1; $bytes / 1073741824" | bc)
    fi
}

# Get current stats
CURRENT_STATS=$(get_network_stats)
CURRENT_IN=$(echo $CURRENT_STATS | awk '{print $1}')
CURRENT_OUT=$(echo $CURRENT_STATS | awk '{print $2}')
CURRENT_TIME=$(date +%s)

# Read previous stats from cache
if [ -f "$CACHE_FILE" ]; then
    PREV_STATS=$(cat "$CACHE_FILE")
    PREV_IN=$(echo $PREV_STATS | awk '{print $1}')
    PREV_OUT=$(echo $PREV_STATS | awk '{print $2}')
    PREV_TIME=$(echo $PREV_STATS | awk '{print $3}')
    
    # Calculate time difference
    TIME_DIFF=$((CURRENT_TIME - PREV_TIME))
    
    if [ $TIME_DIFF -gt 0 ]; then
        # Calculate rates (bytes per second)
        IN_RATE=$(( (CURRENT_IN - PREV_IN) / TIME_DIFF ))
        OUT_RATE=$(( (CURRENT_OUT - PREV_OUT) / TIME_DIFF ))
        
        # Ensure non-negative rates
        [ $IN_RATE -lt 0 ] && IN_RATE=0
        [ $OUT_RATE -lt 0 ] && OUT_RATE=0
    else
        IN_RATE=0
        OUT_RATE=0
    fi
else
    IN_RATE=0
    OUT_RATE=0
fi

# Save current stats to cache
echo "$CURRENT_IN $CURRENT_OUT $CURRENT_TIME" > "$CACHE_FILE"

# Format the rates
IN_FORMATTED=$(format_bytes $IN_RATE)
OUT_FORMATTED=$(format_bytes $OUT_RATE)

# Handle different items
case "$NAME" in
    network.down)
        # Determine download icon color based on speed
        if [ $IN_RATE -eq 0 ]; then
            ICON_COLOR=$OVERLAY0  # Gray for idle
        elif [ $IN_RATE -lt 1048576 ]; then  # < 1MB/s
            ICON_COLOR=$OVERLAY1  # Light gray for low
        elif [ $IN_RATE -lt 5242880 ]; then  # < 5MB/s
            ICON_COLOR=$GREEN  # Green for medium
        elif [ $IN_RATE -lt 10485760 ]; then  # < 10MB/s
            ICON_COLOR=$YELLOW  # Yellow for high
        elif [ $IN_RATE -lt 52428800 ]; then  # < 50MB/s
            ICON_COLOR=$PEACH  # Orange for very high
        else  # >= 50MB/s
            ICON_COLOR=$RED  # Red for extreme
        fi
        
        sketchybar --set $NAME label="$IN_FORMATTED" icon.color=$ICON_COLOR
        ;;
        
    network.up)
        # Determine upload icon color based on speed
        if [ $OUT_RATE -eq 0 ]; then
            ICON_COLOR=$OVERLAY0  # Gray for idle
        elif [ $OUT_RATE -lt 1048576 ]; then  # < 1MB/s
            ICON_COLOR=$OVERLAY1  # Light gray for low
        elif [ $OUT_RATE -lt 5242880 ]; then  # < 5MB/s
            ICON_COLOR=$GREEN  # Green for medium
        elif [ $OUT_RATE -lt 10485760 ]; then  # < 10MB/s
            ICON_COLOR=$YELLOW  # Yellow for high
        elif [ $OUT_RATE -lt 52428800 ]; then  # < 50MB/s
            ICON_COLOR=$PEACH  # Orange for very high
        else  # >= 50MB/s
            ICON_COLOR=$RED  # Red for extreme
        fi
        
        sketchybar --set $NAME label="$OUT_FORMATTED" icon.color=$ICON_COLOR
        ;;
esac