#!/usr/bin/env bash
set -euo pipefail

# Cache the full atop JSON for 5s, then extract all_power and print as XX.XX
CACHE_JSON_FILE="/tmp/zellij_atop.json"
TTL_SECONDS=5

# Ensure required tools exist
if ! command -v atop >/dev/null 2>&1 || ! command -v jq >/dev/null 2>&1; then
  echo "usage.sh error?"
  exit 0
fi

now_epoch=$(date +%s)
use_cache=false
if [[ -f "$CACHE_JSON_FILE" ]]; then
  mtime_epoch=$(stat -f %m "$CACHE_JSON_FILE" 2>/dev/null || echo 0)
  if (( now_epoch - mtime_epoch < TTL_SECONDS )); then
    use_cache=true
  fi
fi

json=""
if $use_cache; then
  json=$(cat "$CACHE_JSON_FILE" 2>/dev/null || true)
else
  json=$(atop --json -s 1 2>/dev/null || true)
  if [[ -n "${json:-}" ]]; then
    printf "%s" "$json" > "$CACHE_JSON_FILE"
  else
    # fallback to cache if command failed
    if [[ -f "$CACHE_JSON_FILE" ]]; then
      json=$(cat "$CACHE_JSON_FILE" 2>/dev/null || true)
    fi
  fi
fi

if [[ -z "${json:-}" ]]; then
  echo "usage.sh error?"
  exit 0
fi

value=$(printf "%s" "$json" | jq -r '
  [
    ..
    | .all_power?
    | select(.)
    | (if type=="string" then (tonumber? // .) else . end)
  ][0]
' 2>/dev/null || true)

if [[ -z "${value:-}" || "$value" == "null" ]]; then
  echo "usage.sh error?"
  exit 0
fi

printf "%.2f\n" "$value"


