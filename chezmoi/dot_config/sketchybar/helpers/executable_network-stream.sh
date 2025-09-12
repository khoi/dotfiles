#!/usr/bin/env bash

# Network monitoring service that streams network stats
# Uses netstat -w1 to continuously monitor network traffic

set -euo pipefail

SKETCHYBAR_BIN="/opt/homebrew/bin/sketchybar"

echo "[network-stream] Starting network monitoring service..."

if ! command -v "$SKETCHYBAR_BIN" >/dev/null 2>&1; then
  echo "[network-stream] Error: sketchybar not found at $SKETCHYBAR_BIN"
  exit 0
fi

# Function to format bytes to MB/s
format_bytes() {
    local bytes=$1
    # Always show in MB/s
    local mbps=$((bytes / 1000000))
    printf "%03d MB/s" $mbps
}

# Use netstat -w1 to get continuous network stats
# The output format is: packets in, bytes in, packets out, bytes out
netstat -w1 -I en0 | while read -r line; do
    # Skip header lines
    if [[ "$line" == *"packets"* ]] || [[ "$line" == *"input"* ]]; then
        continue
    fi
    
    # Parse the netstat output
    # Format: packets_in errs_in bytes_in packets_out errs_out bytes_out colls
    IN_BYTES=$(echo "$line" | awk '{print $3}')
    OUT_BYTES=$(echo "$line" | awk '{print $6}')
    
    # Default to 0 if empty
    IN_BYTES=${IN_BYTES:-0}
    OUT_BYTES=${OUT_BYTES:-0}
    
    # Skip if we don't have valid numbers
    if ! [[ "$IN_BYTES" =~ ^[0-9]+$ ]] || ! [[ "$OUT_BYTES" =~ ^[0-9]+$ ]]; then
        # Send a zero update instead of skipping to prevent flickering
        IN_BYTES=0
        OUT_BYTES=0
    fi
    
    # Format the rates (netstat -w1 already gives us bytes per second)
    IN_FORMATTED=$(format_bytes $IN_BYTES)
    OUT_FORMATTED=$(format_bytes $OUT_BYTES)
    
    # Log the update
    echo "[network-stream] Update: Download=$IN_FORMATTED ($IN_BYTES bytes/s), Upload=$OUT_FORMATTED ($OUT_BYTES bytes/s)"
    
    # Trigger SketchyBar event with network stats (variables must be uppercase)
    $SKETCHYBAR_BIN --trigger network_update \
        DOWNLOAD="$IN_FORMATTED" \
        UPLOAD="$OUT_FORMATTED" \
        DOWNLOAD_BYTES="$IN_BYTES" \
        UPLOAD_BYTES="$OUT_BYTES"
done