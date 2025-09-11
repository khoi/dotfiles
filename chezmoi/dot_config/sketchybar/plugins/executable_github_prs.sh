#!/usr/bin/env sh

# Load color scheme
source "$HOME/.config/sketchybar/colors.sh"

# Handle mouse clicks
if [ "$SENDER" = "mouse.clicked" ]; then
    open "https://github.com/pulls"
    exit 0
fi

# Check if gh is available
if ! command -v gh &> /dev/null; then
    sketchybar --set $NAME label="gh not found" icon.color=$COLOR_RED
    exit 0
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    sketchybar --set $NAME label="Not authenticated" icon.color=$COLOR_YELLOW
    exit 0
fi

# Get open PRs count where you're the author across all repos
PR_COUNT=$(gh search prs --author="@me" --state=open --json repository | jq 'length' 2>/dev/null)

if [ -z "$PR_COUNT" ]; then
    PR_COUNT=0
fi

# Set icon based on PR count
if [ "$PR_COUNT" -eq 0 ]; then
    ICON_COLOR=$COLOR_GREEN
elif [ "$PR_COUNT" -le 3 ]; then
    ICON_COLOR=$COLOR_YELLOW
else
    ICON_COLOR=$COLOR_RED
fi

# Update the item
if [ "$PR_COUNT" -eq 0 ]; then
    sketchybar --set $NAME \
        label="" \
        icon.color=$ICON_COLOR \
        label.drawing=off
else
    sketchybar --set $NAME \
        label="$PR_COUNT" \
        icon.color=$ICON_COLOR \
        label.drawing=on
fi