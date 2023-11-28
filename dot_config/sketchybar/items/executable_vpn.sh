sketchybar --add item vpn right \
    --set vpn update_freq=3 \
    icon.padding_left=4 \
    icon.padding_right=4 \
    icon.y_offset=0 \
    background.color=$BACKGROUND_COLOR \
    script="$PLUGIN_DIR/vpn.sh" \
    click_script="$PLUGIN_DIR/vpn_click.sh"
