NETWORK=(
  script="$PLUGIN_DIR/wifi.sh"
)

sketchybar --add item network right
sketchybar --set network "${NETWORK[@]}"
sketchybar --subscribe network wifi_change