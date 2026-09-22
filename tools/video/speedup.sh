#!/bin/bash
# Speeds up a finished explainer video by a given factor (both audio and video, in sync).
# atempo preserves pitch (no chipmunk effect) — unlike a naive resample.
set -e
FF=/Users/yash/Library/Python/3.9/lib/python/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-x86_64-v7.1
FACTOR="${3:-1.2}"
"$FF" -y -loglevel error -i "$1" \
  -filter_complex "[0:v]setpts=PTS/${FACTOR}[v];[0:a]atempo=${FACTOR}[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -pix_fmt yuv420p -crf 20 -preset medium -c:a aac -b:a 128k -movflags +faststart \
  "$2"
