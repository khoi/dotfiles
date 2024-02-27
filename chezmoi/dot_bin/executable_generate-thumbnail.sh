#!/bin/bash

if [ -z "$1" ] 
then
    echo "No argument supplied"
    echo "Example: fd -e mov -e mp4 | parallel generate-thumbnail.sh"
    exit 1
fi

echo "Generating thumbnail for $1"

if test -f "$1.jpeg"; then
  echo "$1.jpeg exist, nothing todo. bailing."
  exit 0
fi

vcs -c 4 -n 20 -ds -j -A "$1" -o "$1.jpeg"
