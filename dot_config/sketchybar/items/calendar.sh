CALENDAR=(
  background.padding_right=0
  script="$PLUGIN_DIR/calendar.sh"
  icon="􀉉"
  update_freq=5
)

sketchybar --add item time right
sketchybar --set time "${CALENDAR[@]}" \
  --subscribe calendar system_woke
