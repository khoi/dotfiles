#!/usr/bin/env bash
set -Eeuo pipefail

root=$(mktemp -d)
trap 'rm -rf "$root"' EXIT

script="$PWD/chezmoi/dot_bin/executable_rsync_parallel"
source_dir="$root/source dir"
contents_destination="$root/contents/"
container_destination="$root/container/"

mkdir -p "$source_dir/nested folder" "$contents_destination" "$container_destination"
printf 'alpha\n' >"$source_dir/ leading.txt"
printf 'beta\n' >"$source_dir/trailing "
printf 'gamma\n' >"$source_dir/nested folder/file.txt"
ln -s ' leading.txt' "$source_dir/link"

bash "$script" --parallel=2 -a -- "$source_dir/" "$contents_destination"
diff -r "$source_dir" "$contents_destination"

bash "$script" --parallel=2 -a -- "$source_dir" "$container_destination"
diff -r "$source_dir" "$container_destination/$(basename "$source_dir")"

for option in --del --delete --files-from=/tmp/files --from0 --hard-links --relative --remove-source-files -R -H -aRH -Ha; do
  if bash "$script" --parallel=2 "$option" -- "$source_dir/" "$contents_destination" >"$root/rejected" 2>&1; then
    exit 1
  fi
  grep -q 'unsupported rsync option' "$root/rejected"
done

if bash "$script" --parallel=2 -a -- "$source_dir/" "$root/no-slash" >"$root/destination" 2>&1; then
  exit 1
fi
grep -q 'destination must end in /' "$root/destination"

if bash "$script" --parallel=2 -a -- "$root/missing/" "$contents_destination" >"$root/missing" 2>&1; then
  exit 1
fi
