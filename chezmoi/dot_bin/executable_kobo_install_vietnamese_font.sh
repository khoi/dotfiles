#!/usr/bin/env zsh

set -Eeuo pipefail

echo "🇻🇳 Install Vietnamese font for Kobo eReader"

mount=/Volumes/KOBOeReader
downloads="$HOME/Downloads"
fonts="$HOME/Library/Mobile Documents/com~apple~CloudDocs/KoboFonts"

if [[ ! -d "$mount" ]]; then
  echo "KOBOeReader is not mounted"
  exit 1
fi

if [[ ! -d "$fonts" ]]; then
  echo "Kobo fonts directory is missing"
  exit 1
fi

curl -fL -o "$downloads/KoboRoot.tgz" https://github.com/lelinhtinh/kobo-tieng-viet/releases/download/v0.5.0/KoboRoot.tgz
cp "$downloads/KoboRoot.tgz" "$mount/.kobo"

curl -fL -o "$downloads/dictutil" https://github.com/pgaskin/dictutil/releases/download/v0.3.2/dictutil-darwin-64bit
xattr -r -d com.apple.quarantine "$downloads/dictutil" 2>/dev/null || true
chmod +x "$downloads/dictutil"

curl -fL -o "$downloads/dicthtml-en-vi.zip" https://github.com/lelinhtinh/kobo-tieng-viet/releases/download/v0.4.0/dicthtml-en-vi.zip
"$downloads/dictutil" install "$downloads/dicthtml-en-vi.zip"

curl -fL -o "$downloads/dicthtml-vi-en.zip" https://github.com/lelinhtinh/kobo-tieng-viet/releases/download/v0.4.0/dicthtml-vi-en.zip
"$downloads/dictutil" install "$downloads/dicthtml-vi-en.zip"

mkdir -p "$mount/fonts"
cp -R "$fonts/." "$mount/fonts/"
