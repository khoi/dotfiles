#!/bin/bash

# Color Palette
# Based on gruvchad https://github.com/NvChad/base46/blob/v2.0/lua/base46/themes/gruvchad.lua

# base00 - Default Background
# base01 - Lighter Background (Used for status bars, line number and folding marks)
# base02 - Selection Background
# base03 - Comments, Invisibles, Line Highlighting
# base04 - Dark Foreground (Used for status bars)
# base05 - Default Foreground, Caret, Delimiters, Operators
# base06 - Light Foreground (Not often used)
# base07 - Light Background (Not often used)
# base08 - Variables, XML Tags, Markup Link Text, Markup Lists, Diff Deleted
# base09 - Integers, Boolean, Constants, XML Attributes, Markup Link Url
# base0A - Classes, Markup Bold, Search Text Background
# base0B - Strings, Inherited Class, Markup Code, Diff Inserted
# base0C - Support, Regular Expressions, Escape Characters, Markup Quotes
# base0D - Functions, Methods, Attribute IDs, Headings
# base0E - Keywords, Storage, Selector, Markup Italic, Diff Changed
# base0F - Deprecated, Opening/Closing Embedded Language Tags, e.g. <?php ?>

export BASE00=0xff1e2122
export BASE01=0xff2c2f30
export BASE02=0xff36393a
export BASE03=0xff404344
export BASE04=0xffd4be98
export BASE05=0xffc0b196
export BASE06=0xffc3b499
export BASE07=0xffc7b89d
export BASE08=0xffec6b64
export BASE09=0xffe78a4e
export BASE0A=0xffe0c080
export BASE0B=0xffa9b665
export BASE0C=0xff86b17f
export BASE0D=0xff7daea3
export BASE0E=0xffd3869b
export BASE0F=0xffd65d0e

# General bar colors
export BACKGROUND=$BASE00
export BACKGROUND_LIGHTER=$BASE01
export BAR_COLOR=$BASE00
export BAR_BORDER_COLOR=$BASE03
export ICON_COLOR=$BASE05  # Color of all icons
export LABEL_COLOR=$BASE05 # Color of all labels
export BACKGROUND_2=$BASE02
export WHITE=$BASE07

export POPUP_BACKGROUND_COLOR=$BASE01
export POPUP_BORDER_COLOR=$BASE03
export GREY=$BASE05
export RED=$BASE08
export BLUE=$BASE0D
export ORANGE=$BASE09
export YELLOW=$BASE0A
export GREEN=$BASE0B
export MAGENTA=$BASE0E
