#!/bin/bash

KOBO_MOUNT="/Volumes/KOBOeReader"
COLLECTION_FILE="$KOBO_MOUNT/.adds/koreader/settings/collection.lua"

# Check if the file already exists
if [ ! -f "$COLLECTION_FILE" ]; then
  echo "Error: Collection file not found at $COLLECTION_FILE"
  exit 1
fi

# Start writing the Lua file
cat >"$COLLECTION_FILE" <<'EOF'
return {
    ["favorites"] = {
EOF

# Find all epub files and process them
counter=1
echo "Processing files..."
fd -e epub -e pdf -e cbz -e mobi -E '.*' . "$KOBO_MOUNT" | while read -r file; do
  # Convert the path from $KOBO_MOUNT to /mnt/onboard
  converted_path=${file//$KOBO_MOUNT//mnt/onboard}
  echo "[$counter] Processing: $converted_path"
  # Write array entry
  cat >>"$COLLECTION_FILE" <<EOF
        [$counter] = {
            ["file"] = "$converted_path",
            ["order"] = $counter,
        },
EOF
  ((counter++))
done

# Add settings and close the structure
cat >>"$COLLECTION_FILE" <<'EOF'
        ["settings"] = {
            ["order"] = 1,
        },
    },
}
EOF
