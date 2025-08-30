#!/usr/bin/env bash
set -euo pipefail

# Prints system all_power from a single 1s sample
atop --json -s 1 | jq -r '
  [
    ..
    | .all_power?
    | select(.)
    | (if type=="string" then (tonumber? // .) else . end)
  ][0]
' | awk '{printf "%.2f\n", $1}'


