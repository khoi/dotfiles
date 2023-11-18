#!/usr/bin/env bash

if [ -z "$1" ] 
then
    echo "No argument supplied"
    exit 1
fi

ffmpeg -i "$1" -filter_complex "[0:v]reverse,fifo[r];[0:v][0:a][r] [0:a]concat=n=2:v=1:a=1 [v] [a]" -map "[v]" -map "[a]" "$1_out".mp4
