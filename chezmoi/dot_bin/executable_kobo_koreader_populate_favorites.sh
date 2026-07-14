#!/usr/bin/env bash
set -Eeuo pipefail

mount=/Volumes/KOBOeReader
collection="$mount/.adds/koreader/settings/collection.lua"

if [[ ! -f "$collection" ]]; then
  echo "Collection file not found at $collection" >&2
  exit 1
fi

tmp=$(mktemp "$collection.XXXXXX")
files=$(mktemp)
trap 'rm -f "$tmp" "$files"' EXIT

fd -0 -e epub -e pdf -e cbz -e mobi -E '.*' . "$mount" >"$files"

cat >"$tmp" <<'EOF'
return {
    ["favorites"] = {
EOF

counter=1
while IFS= read -r -d '' file; do
  path=${file//$mount//mnt/onboard}
  path=${path//\\/\\\\}
  path=${path//\"/\\\"}
  path=${path//$'\n'/\\n}
  path=${path//$'\r'/\\r}
  path=${path//$'\t'/\\t}
  cat >>"$tmp" <<EOF
        [$counter] = {
            ["file"] = "$path",
            ["order"] = $counter,
        },
EOF
  ((counter += 1))
done <"$files"

cat >>"$tmp" <<'EOF'
        ["settings"] = {
            ["order"] = 1,
        },
    },
}
EOF

mv "$tmp" "$collection"
rm -f "$files"
trap - EXIT
