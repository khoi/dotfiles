BATTERY=(
  update_freq=60
  script="$PLUGIN_DIR/battery.sh"
)

sketchybar --add item battery right
sketchybar --set battery "${BATTERY[@]}"
sketchybar --subscribe battery system_woke power_source_change
