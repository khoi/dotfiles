#!/usr/bin/env sh

# Sketchybar Color Scheme Configuration
# All colors are in 0xAARRGGBB format (Alpha, Red, Green, Blue)

# ============================================================================
# COLOR PALETTE - Catppuccin Mocha
# ============================================================================
# To switch themes, replace this section with another palette (e.g., Dracula)

# Catppuccin Mocha Base Colors
export ROSEWATER=0xfff5e0dc
export FLAMINGO=0xfff2cdcd
export PINK=0xfff5c2e7
export MAUVE=0xffcba6f7
export RED=0xfff38ba8
export MAROON=0xffeba0ac
export PEACH=0xfffab387
export YELLOW=0xfff9e2af
export GREEN=0xffa6e3a1
export TEAL=0xff94e2d5
export SKY=0xff89dceb
export SAPPHIRE=0xff74c7ec
export BLUE=0xff89b4fa
export LAVENDER=0xffb4befe

# Catppuccin Mocha Neutral Colors
export TEXT=0xffcdd6f4
export SUBTEXT1=0xffbac2de
export SUBTEXT0=0xffa6adc8
export OVERLAY2=0xff9399b2
export OVERLAY1=0xff7f849c
export OVERLAY0=0xff6c7086
export SURFACE2=0xff585b70
export SURFACE1=0xff45475a
export SURFACE0=0xff313244
export BASE=0xff1e1e2e
export MANTLE=0xff181825
export CRUST=0xff11111b

# Transparency variants
export TRANSPARENT=0x00000000
export BASE_TRANSLUCENT=0x661e1e2e      # 40% opacity
export SURFACE1_TRANSLUCENT=0x6645475a   # 40% opacity
export SKY_TRANSLUCENT=0x6689dceb        # 40% opacity

# ============================================================================
# FUNCTIONAL COLOR MAPPINGS
# ============================================================================
# Map functional colors to palette colors above

# Base Colors
export COLOR_TRANSPARENT=$TRANSPARENT
export COLOR_BAR_BG=$SURFACE1_TRANSLUCENT  # Semi-transparent surface
export COLOR_ITEM_BG=$SURFACE1_TRANSLUCENT # Default item background

# Text Colors
export COLOR_TEXT_DARK=$CRUST              # Dark text for light backgrounds
export COLOR_TEXT_LIGHT=$TEXT              # Light text for dark backgrounds
export COLOR_TEXT_VERY_DARK=$MANTLE        # Very dark text

# Accent Colors (direct mappings for backwards compatibility)
export COLOR_PEACH=$PEACH
export COLOR_GREEN=$GREEN
export COLOR_RED=$RED
export COLOR_YELLOW=$YELLOW
export COLOR_BLUE=$BLUE
export COLOR_PINK=$PINK
export COLOR_LIGHT_RED=$MAROON
export COLOR_LIGHT_BLUE=$SKY_TRANSLUCENT

# Semantic Color Mappings
export COLOR_CURRENT_SPACE=$PEACH
export COLOR_FRONT_APP=$GREEN
export COLOR_CLOCK=$RED
export COLOR_VOLUME=$BLUE
export COLOR_WEATHER=$PINK
export COLOR_MOON_BG=$SKY_TRANSLUCENT
export COLOR_MOON_ICON=$COLOR_TEXT_VERY_DARK

# Battery Colors
export COLOR_BATTERY_FULL=$GREEN
export COLOR_BATTERY_HIGH=$YELLOW
export COLOR_BATTERY_MEDIUM=$PEACH
export COLOR_BATTERY_LOW=$MAROON
export COLOR_BATTERY_CRITICAL=$RED
export COLOR_BATTERY_CHARGING=$YELLOW

# Media Colors (formerly Spotify)
export COLOR_MEDIA_PRIMARY=$GREEN
