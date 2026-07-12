#!/usr/bin/env zsh
set -Eeuo pipefail

on_ac_power() {
  /usr/bin/pmset -g batt | /usr/bin/head -n 1 | /usr/bin/grep -q "AC Power"
}

storage_box_reachable() {
  /usr/bin/nc -G 5 -z u629978.your-storagebox.de 23
}

while (( 10#$(/bin/date +%H%M) < 500 )); do
  if on_ac_power && storage_box_reachable; then
    exec /usr/bin/caffeinate -s "$HOME/.bin/restic_backup.sh"
  fi

  /bin/sleep 300
done
