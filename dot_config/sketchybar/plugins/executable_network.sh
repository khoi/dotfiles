#!/usr/bin/env sh
UPDOWN=$(ifstat -a -T 0.1 1 | tail -n 1 | awk '{print $(NF-1),$NF}')
DOWN=$(echo $UPDOWN | awk "{ print \$1 }" | cut -f1 -d ".")
UP=$(echo $UPDOWN | awk "{ print \$2 }" | cut -f1 -d ".")

DOWN_FORMAT=$(echo $DOWN | awk '{ printf "%03.0f MB", $1 / 1024}')
UP_FORMAT=$(echo $UP | awk '{ printf "%03.0f MB", $1 / 1024}')

sketchybar -m --set network_down label="$DOWN_FORMAT" icon.highlight=$(if [ "$DOWN" -gt "0" ]; then echo "on"; else echo "off"; fi) \
    --set network_up label="$UP_FORMAT" icon.highlight=$(if [ "$UP" -gt "0" ]; then echo "on"; else echo "off"; fi)
