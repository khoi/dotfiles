#!/usr/bin/env bash

set -Eeuo pipefail
script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd -P)
script_name=$(basename "${BASH_SOURCE[0]}")

msg() {
  echo >&2 -e "${1-}"
}

die() {
  local msg=$1
  local code=${2-1} # default exit status 1
  msg "$msg"
  exit "$code"
}

parse_params() {
  while :; do
    case "${1-}" in
    -h | --help) usage ;;
    -?*) die "Unknown option: $1" ;;
    *) break ;;
    esac
    shift
  done

  args=("$@")
  return 0
}

usage() {
  cat <<EOF
Usage: $script_name "username"

Available options:

-h, --help      Print this help and exit
EOF
  exit
}

if ! command -v gh &>/dev/null; then
  echo "gh could not be found. Install it first"
  exit
fi

parse_params "$@"

if [[ ${#args[@]} -eq 0 ]]; then
  username=$(gh api user | jq -r '.login')
  if [[ -z "$username" ]]; then
    die "Failed to fetch username from GitHub CLI. Please provide a username or check your GitHub authentication."
  fi
elif [[ ${#args[@]} -eq 1 ]]; then
  username=${args[0]}
else
  die "Too many arguments. Please provide only one username or none."
fi

echo "🌐 Fetching PRs for $username"

# Fetch PR numbers
pr_numbers=$(gh pr list -A "$username" --json number | jq -r '.[].number')

for pr in $pr_numbers; do
  echo "🔄 Updating PR #$pr"
  gh pr update-branch "$pr" || true
done

echo "✅ Done updating PRs"

