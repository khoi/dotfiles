#!/usr/bin/env zsh
set -Eeuo pipefail

on_ac_power() {
  /usr/bin/pmset -g batt | /usr/bin/head -n 1 | /usr/bin/grep -q "AC Power"
}

storage_box_reachable() {
  /usr/bin/nc -G 5 -z u629978.your-storagebox.de 23 &>/dev/null
}

(( $# > 0 )) || exit 2

while (( SECONDS < 2 * 60 * 60 )); do
  if on_ac_power && storage_box_reachable; then
    exec /usr/bin/caffeinate -s "$@"
  fi

  /bin/sleep 300
done
