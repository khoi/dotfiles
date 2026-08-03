#!/usr/bin/env bash
# Print the path to Ghidra's analyzeHeadless, or explain how to install it.
set -euo pipefail

homes=()

if [[ -n "${GHIDRA_HOME:-}" ]]; then
    homes+=("$GHIDRA_HOME")
fi

if prefix=$(brew --prefix ghidra 2>/dev/null); then
    homes+=("$prefix/libexec")
fi

homes+=(/opt/ghidra /usr/local/ghidra /usr/share/ghidra /Applications/ghidra "$HOME/ghidra")

for versioned in /opt/ghidra_* /Applications/ghidra_* "$HOME"/ghidra_*; do
    if [[ -d "$versioned" ]]; then
        homes+=("$versioned")
    fi
done

for home in "${homes[@]}"; do
    if [[ -x "$home/support/analyzeHeadless" ]]; then
        echo "$home/support/analyzeHeadless"
        exit 0
    fi
done

cat >&2 <<'EOF'
Ghidra not found.

  macOS:  brew install ghidra          (a formula, not a cask)
  Linux:  download from https://ghidra-sre.org/

Or point at an existing copy:

  export GHIDRA_HOME=/path/to/ghidra_11.x_PUBLIC
EOF
exit 1
