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

  [[ ${#args[@]} -eq 0 ]] && die "Missing script arguments"

  return 0
}

usage() {
  cat <<EOF
Usage: $script_name issue_number

Available options:

-h, --help      Print this help and exit
EOF
  exit
}

if ! command -v gh &> /dev/null
then
    echo "gh could not be found. Install it first"
    exit
fi


parse_params "$@"
issue_number=${args[0]}
msg "Issue ${args[0]}"

echo "✅ Approving the PR"
gh pr review -a $issue_number || echo "🪞 Narcissism?"

echo "🟩 Reset git to clean state"
git reset --hard

echo "🏨 Checking out"
gh pr checkout $issue_number

echo "👇 Pulling"
git pull --ff-only origin $(git branch --show-current)

echo "🐙 Update to master branch if needed"
git pull --no-ff --no-edit origin master

echo "👆 Pushing the merge commit"
git push origin $(git branch --show-current)

echo "⏰ Wating for CI and merge"
until gh pr merge $issue_number -s; do sleep 15; done