#!/usr/bin/env bash
set -Eeuo pipefail

root=$(mktemp -d)
trap 'rm -rf "$root"' EXIT

script="$PWD/chezmoi/dot_bin/executable_rsync_parallel"
source_dir="$root/source dir"
contents_destination="$root/contents/"
container_destination="$root/container/"

mkdir -p "$source_dir/nested folder" "$source_dir/empty" "$contents_destination" "$container_destination"
printf 'alpha\n' >"$source_dir/ leading.txt"
printf 'beta\n' >"$source_dir/trailing "
printf 'gamma\n' >"$source_dir/nested folder/file.txt"
ln -s ' leading.txt' "$source_dir/link"
touch -t 202001010101 "$source_dir" "$source_dir/nested folder" "$source_dir/empty"

bash "$script" --parallel=2 -a -- "$source_dir/" "$contents_destination"
diff -r "$source_dir" "$contents_destination"
[[ $(stat -f %m "$source_dir/nested folder") == $(stat -f %m "$contents_destination/nested folder") ]]
[[ $(stat -f %m "$source_dir/empty") == $(stat -f %m "$contents_destination/empty") ]]

bash "$script" --parallel=2 -a -- "$source_dir" "$container_destination"
diff -r "$source_dir" "$container_destination/$(basename "$source_dir")"

shell_destination="$root/shell/"
mkdir -p "$shell_destination"
bash "$script" --parallel=2 -azvhP -e true -- "$source_dir/" "$shell_destination" >/dev/null
diff -r "$source_dir" "$shell_destination"

recursive_destination="$root/recursive/"
mkdir -p "$recursive_destination"
output=$(bash "$script" --parallel=3 -av -- "$source_dir/" "$recursive_destination")
diff -r "$source_dir" "$recursive_destination"
[[ $(grep -c 'nested folder/file.txt' <<<"$output") -eq 1 ]]

for option in --del --delete --hard --hard-l --recursive --rem --remove --remove-source-files -R -H -aRH -Ha -aq -c -rlv -x -Z; do
  if bash "$script" --parallel=2 "$option" -- "$source_dir/" "$contents_destination" >"$root/rejected" 2>&1; then
    exit 1
  fi
  grep -q 'unsupported rsync option' "$root/rejected"
done

if bash "$script" --parallel=2 -- "$source_dir/" "$contents_destination" >"$root/archive" 2>&1; then
  exit 1
fi
grep -q 'rsync option -a is required' "$root/archive"

if bash "$script" --parallel=2 -a -- "$source_dir/" "$root/no-slash" >"$root/destination" 2>&1; then
  exit 1
fi
grep -q 'destination must end in /' "$root/destination"

if bash "$script" --parallel=2 -a -- "$root/missing/" "$contents_destination" >"$root/missing" 2>&1; then
  exit 1
fi
