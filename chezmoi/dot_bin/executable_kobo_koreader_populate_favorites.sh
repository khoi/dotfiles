#!/bin/bash

COLLECTION_FILE="/Volumes/KOBOeReader/.adds/koreader/settings/collection.lua"

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
find /Volumes/KOBOeReader -type f \( -name "*.epub" -o -name "*.pdf" \) | while read -r file; do
  echo "[$counter] Processing: $file"
  # Write array entry
  cat >>"$COLLECTION_FILE" <<EOF
        [$counter] = {
            ["file"] = "$file",
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
