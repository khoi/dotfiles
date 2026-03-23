if [ -x /opt/homebrew/bin/brew ]; then
  HOMEBREW_BIN=/opt/homebrew/bin/brew
elif [ -x /usr/local/bin/brew ]; then
  HOMEBREW_BIN=/usr/local/bin/brew
elif command -v brew >/dev/null 2>&1; then
  HOMEBREW_BIN=$(command -v brew)
else
  echo "Homebrew is not installed." >&2
  return 1
fi

eval "$("$HOMEBREW_BIN" shellenv)"
