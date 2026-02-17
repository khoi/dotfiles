#!/usr/bin/env bash
set -euo pipefail

count=""
base=""
model="gpt-5.3-codex"
reasoning_effort="high"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --count)
      count="${2:-}"
      shift 2
      ;;
    --base)
      base="${2:-}"
      shift 2
      ;;
    --model)
      model="${2:-}"
      shift 2
      ;;
    --reasoning-effort)
      reasoning_effort="${2:-}"
      shift 2
      ;;
    *)
      echo "unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

if [[ -z "$count" || ! "$count" =~ ^[0-9]+$ || "$count" -le 0 ]]; then
  echo "--count must be a positive integer" >&2
  exit 2
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "must run inside a git repository" >&2
  exit 1
fi

detect_base_branch() {
  local candidate

  candidate="$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null || true)"
  if [[ -n "$candidate" ]]; then
    echo "${candidate##*/}"
    return 0
  fi

  if command -v gh >/dev/null 2>&1; then
    candidate="$(gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name' 2>/dev/null || true)"
    if [[ -n "$candidate" ]]; then
      echo "$candidate"
      return 0
    fi
  fi

  candidate="$(git remote show origin 2>/dev/null | awk -F': ' '/HEAD branch/ {print $2; exit}' || true)"
  if [[ -n "$candidate" ]]; then
    echo "$candidate"
    return 0
  fi

  return 1
}

if [[ -z "$base" ]]; then
  if ! base="$(detect_base_branch)"; then
    echo "unable to detect default base branch" >&2
    exit 1
  fi
fi

export PARALLEL_REVIEW_MODEL="$model"
export PARALLEL_REVIEW_BASE="$base"
export PARALLEL_REVIEW_REASONING="$reasoning_effort"

combined="$(
  seq 1 "$count" | xargs -P "$count" -I{} bash -c '
    idx="$1"
    out="$(codex e review -m "$PARALLEL_REVIEW_MODEL" -c "model_reasoning_effort='\''\"$PARALLEL_REVIEW_REASONING\"'\''" --base "$PARALLEL_REVIEW_BASE" 2>/dev/null)"
    code="$?"
    printf "<<<REVIEW:%s:EXIT:%s>>>\n" "$idx" "$code"
    printf "%s\n" "$out"
    printf "<<<END:%s>>>\n" "$idx"
  ' _ {}
)"

printf "Base branch: %s\n" "$base"
printf "Reviewers requested: %s\n" "$count"
printf "\n"

printf '%s\n' "$combined" | awk -v total="$count" '
  /^<<<REVIEW:[0-9]+:EXIT:[0-9]+>>>$/ {
    raw = $0
    run = raw
    gsub(/^<<<REVIEW:/, "", run)
    gsub(/:EXIT:[0-9]+>>>$/, "", run)
    code = raw
    gsub(/^<<<REVIEW:[0-9]+:EXIT:/, "", code)
    gsub(/>>>$/, "", code)
    current = run + 0
    blocks[current] = "===== REVIEW RUN " current " (exit " code ") =====\n"
    next
  }
  /^<<<END:[0-9]+>>>$/ {
    if (current > 0) {
      blocks[current] = blocks[current] "===== END REVIEW RUN " current " =====\n"
    }
    current = 0
    next
  }
  {
    if (current > 0) {
      blocks[current] = blocks[current] $0 "\n"
    }
  }
  END {
    for (i = 1; i <= total; i++) {
      if (blocks[i] == "") {
        print "===== REVIEW RUN " i " (missing output) ====="
        print "===== END REVIEW RUN " i " ====="
      } else {
        printf "%s", blocks[i]
      }
      if (i < total) {
        print ""
      }
    }
  }
'
