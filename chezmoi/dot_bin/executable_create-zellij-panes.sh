#!/usr/bin/env bash

set -euo pipefail

usage() {
    cat <<'EOF' >&2
Usage: create-zellij-panes.sh <number-of-panes>
Split the current zellij tab into equally sized panes.
EOF
}

if [[ $# -ne 1 ]]; then
    usage
    exit 1
fi

if ! [[ $1 =~ ^[0-9]+$ ]]; then
    echo "Error: number of panes must be a positive integer." >&2
    exit 1
fi

pane_count=$1

if (( pane_count < 1 )); then
    echo "Error: number of panes must be at least 1." >&2
    exit 1
fi

if [[ -z "${ZELLIJ:-}" ]]; then
    echo "Error: this script must run from inside a zellij session." >&2
    exit 1
fi

if ! command -v zellij >/dev/null 2>&1; then
    echo "Error: zellij executable not found in PATH." >&2
    exit 1
fi

run_action() {
    if ! zellij action "$@"; then
        echo "Error running: zellij action $*" >&2
        exit 1
    fi
}

if (( pane_count == 1 )); then
    exit 0
fi

toggle_direction() {
    case "$1" in
        right) printf '%s\n' down ;;
        down) printf '%s\n' right ;;
        *) echo "Error: unsupported split direction '$1'." >&2; exit 1 ;;
    esac
}

opposite_direction() {
    case "$1" in
        right) printf '%s\n' left ;;
        down) printf '%s\n' up ;;
        *) echo "Error: unsupported split direction '$1'." >&2; exit 1 ;;
    esac
}

split_region() {
    local count=$1
    local direction=$2

    if (( count <= 1 )); then
        return
    fi

    local primary=$(((count + 1) / 2))
    local secondary=$((count - primary))
    local opposite
    opposite=$(opposite_direction "$direction")
    local next_direction
    next_direction=$(toggle_direction "$direction")

    run_action new-pane --direction "$direction" --cwd "$PWD"

    run_action move-focus "$opposite"
    split_region "$primary" "$next_direction"

    run_action move-focus "$direction"
    split_region "$secondary" "$next_direction"

    run_action move-focus "$opposite"
}

split_region "$pane_count" right
