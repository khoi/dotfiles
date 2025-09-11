#!/usr/bin/env zsh

# Load shared icons if available
ICON_FILE_PATH="$HOME/.config/sketchybar/icons.sh"
if [ -f "$ICON_FILE_PATH" ]; then
  source "$ICON_FILE_PATH"
fi

# App name and optional window content/title as arguments; fall back to $INFO
APP_NAME="${1:-$INFO}"
WINDOW_INFO="${2:-}"

ICON_PADDING_RIGHT=2
RESULT=${ICON_APP:-}

case "$APP_NAME" in
"Terminal" | "Ghostty" | "Warp" | "iTerm2")
  RESULT=${ICON_TERM:-$RESULT}
  if echo "$WINDOW_INFO" | grep -q "btop"; then
    RESULT=${ICON_CHART:-$RESULT}
  fi
  if echo "$WINDOW_INFO" | grep -q "brew"; then
    RESULT=${ICON_PACKAGE:-$RESULT}
  fi
  if echo "$WINDOW_INFO" | grep -q "nvim"; then
    RESULT=${ICON_DEV:-$RESULT}
  fi
  if echo "$WINDOW_INFO" | grep -q "ranger"; then
    RESULT=${ICON_FILE:-$RESULT}
  fi
  if echo "$WINDOW_INFO" | grep -q "lazygit"; then
    RESULT=${ICON_GIT:-$RESULT}
  fi
  if echo "$WINDOW_INFO" | grep -q "taskwarrior-tui"; then
    RESULT=${ICON_LIST:-$RESULT}
  fi
  if echo "$WINDOW_INFO" | grep -q "unimatrix\|pipes.sh"; then
    RESULT=${ICON_SCREENSAVOR:-$RESULT}
  fi
  if echo "$WINDOW_INFO" | grep -q "bat"; then
    RESULT=${ICON_NOTE:-$RESULT}
  fi
  if echo "$WINDOW_INFO" | grep -q "tty-clock"; then
    RESULT=${ICON_CLOCK:-$RESULT}
  fi
  ;;
"Finder")
  RESULT=${ICON_FILE:-$RESULT}
  ;;
"Weather")
  RESULT=${ICON_WEATHER:-$RESULT}
  ;;
"Clock")
  RESULT=${ICON_CLOCK:-$RESULT}
  ;;
"Mail" | "Microsoft Outlook")
  RESULT=${ICON_MAIL:-$RESULT}
  ;;
"Calendar")
  RESULT=${ICON_CALENDAR:-$RESULT}
  ;;
"Calculator" | "Numi")
  RESULT=${ICON_CALC:-$RESULT}
  ;;
"Maps" | "Find My")
  RESULT=${ICON_MAP:-$RESULT}
  ;;
"Voice Memos")
  RESULT=${ICON_MICROPHONE:-$RESULT}
  ;;
"Messages" | "Slack" | "Microsoft Teams" | "Discord" | "Telegram")
  RESULT=${ICON_CHAT:-$RESULT}
  ;;
"FaceTime" | "zoom.us" | "Webex")
  RESULT=${ICON_VIDEOCHAT:-$RESULT}
  ;;
"Notes" | "TextEdit" | "Stickies" | "Microsoft Word")
  RESULT=${ICON_NOTE:-$RESULT}
  ;;
"Reminders" | "Microsoft OneNote")
  RESULT=${ICON_LIST:-$RESULT}
  ;;
"Photo Booth")
  RESULT=${ICON_CAMERA:-$RESULT}
  ;;
"Safari" | "Beam" | "DuckDuckGo" | "Arc" | "Dia" | "Microsoft Edge" | "Google Chrome" | "Firefox")
  RESULT=${ICON_WEB:-$RESULT}
  ;;
"System Settings" | "System Information" | "TinkerTool")
  RESULT=${ICON_COG:-$RESULT}
  ;;
"HOME")
  RESULT=${ICON_HOMEAUTOMATION:-$RESULT}
  ;;
"Music" | "Spotify")
  RESULT=${ICON_MUSIC:-$RESULT}
  ;;
"Podcasts")
  RESULT=${ICON_PODCAST:-$RESULT}
  ;;
"TV" | "QuickTime Player" | "VLC")
  RESULT=${ICON_PLAY:-$RESULT}
  ;;
"Books")
  RESULT=${ICON_BOOK:-$RESULT}
  ;;
"Xcode" | "Code" | "Cursor" | "Zed")
  RESULT=${ICON_DEV:-$RESULT}
  ;;
"Font Book" | "Dictionary")
  RESULT=${ICON_BOOKINFO:-$RESULT}
  ;;
"Activity Monitor")
  RESULT=${ICON_CHART:-$RESULT}
  ;;
"Disk Utility")
  RESULT=${ICON_DISK:-$RESULT}
  ;;
"Screenshot" | "Preview")
  RESULT=${ICON_PREVIEW:-$RESULT}
  ;;
"1Password")
  RESULT=${ICON_PASSKEY:-$RESULT}
  ;;
"NordVPN")
  RESULT=${ICON_VPN:-$RESULT}
  ;;
"Progressive Downloaded" | "Transmission")
  RESULT=${ICON_DOWNLOAD:-$RESULT}
  ;;
"Airflow")
  RESULT=${ICON_CAST:-$RESULT}
  ;;
"Microsoft Excel")
  RESULT=${ICON_TABLE:-$RESULT}
  ;;
"Microsoft PowerPoint")
  RESULT=${ICON_PRESENT:-$RESULT}
  ;;
"OneDrive")
  RESULT=${ICON_CLOUD:-$RESULT}
  ;;
"Curve")
  RESULT=${ICON_PEN:-$RESULT}
  ;;
"VMware Fusion" | "UTM")
  RESULT=${ICON_REMOTEDESKTOP:-$RESULT}
  ;;
*)
  RESULT=${ICON_APP:-$RESULT}
  ;;
esac

sketchybar --set $NAME icon="$RESULT" icon.padding_right=$ICON_PADDING_RIGHT
sketchybar --set $NAME.name label="$APP_NAME"
