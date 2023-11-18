#!/usr/bin/env zsh

set -Eeuo pipefail

curl -o ~/Downloads/KoboRoot.tgz -L https://github.com/lelinhtinh/kobo-tieng-viet/releases/download/v0.4.0/KoboRoot.tgz
cp ~/Downloads/KoboRoot.tgz /Volumes/KOBOeReader/.kobo

curl -o ~/Downloads/dictutil -L https://github.com/pgaskin/dictutil/releases/download/v0.3.2/dictutil-darwin-64bit
sudo xattr -r -d com.apple.quarantine ~/Downloads/dictutil
chmod +x ~/Downloads/dictutil

curl -o ~/Downloads/dicthtml-en-vi.zip -L https://github.com/lelinhtinh/kobo-tieng-viet/releases/download/v0.4.0/dicthtml-en-vi.zip
~/Downloads/dictutil install ~/Downloads/dicthtml-en-vi.zip

curl -o ~/Downloads/dicthtml-vi-en.zip -L https://github.com/lelinhtinh/kobo-tieng-viet/releases/download/v0.4.0/dicthtml-vi-en.zip
~/Downloads/dictutil install ~/Downloads/dicthtml-vi-en.zip

