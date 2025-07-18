#!/usr/bin/env bash

set -Eeuo pipefail
trap cleanup SIGINT SIGTERM ERR EXIT

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd -P)

usage() {
  cat <<EOF # remove the space between << and EOF, this is due to web plugin issue
Usage: $(
    basename "${BASH_SOURCE[0]}"
  ) 

Create a PR based on the commit messages and a PR template.

Available options:

-h, --help                        Print this help and exit
-v, --verbose                     Print script debug info
-b, --base <branch>               Use custom base branch instead of the default
-i, --instructions <text>         Extra instructions appended to the LLM prompt

All other params are passed to "gh pr create".
EOF
  exit
}

cleanup() {
  trap - SIGINT SIGTERM ERR EXIT
}

cd_to_git_root() {
  local git_root=$(git rev-parse --show-toplevel)
  cd "$git_root" || die "Failed to change to git root directory"
  msg "🫚 Git root directory: ${NOFORMAT}$(pwd)"
}

setup_colors() {
  if [[ -t 2 ]] && [[ -z "${NO_COLOR-}" ]] && [[ "${TERM-}" != "dumb" ]]; then
    NOFORMAT='\033[0m' RED='\033[0
31m' GREEN='\033[0
32m' ORANGE='\033[0
33m' BLUE='\033[0
34m' PURPLE='\033[0
35m' CYAN='\033[0
36m' YELLOW='\033[1
33m'
  else
    NOFORMAT='' RED='' GREEN='' ORANGE='' BLUE='' PURPLE='' CYAN='' YELLOW=''
  fi
}

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
  verbose=0
  param=''
  base_branch=""
  extra_instructions=""
  args=()

  while :; do
    case "${1-}" in
    -h | --help) usage ;;
    -v | --verbose) verbose=1 ;;
    -b | --base)
      base_branch="$2"
      shift
      ;;
    -i | --instructions)
      extra_instructions="$2"
      shift
      ;;
    --no-color) NO_COLOR=1 ;;
    -?*)
      # Instead of dying on unknown options, add them to args array
      args+=("$1")
      ;;
    *)
      # Add non-flag arguments to args array
      [[ -n "${1-}" ]] && args+=("$1")
      ;;
    esac
    if [ -z "${1-}" ]; then
      break
    fi
    shift
  done

  return 0
}

parse_params "$@"
setup_colors

# Check if we're inside a git directory
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  msg "${RED}Error: Not inside a git repository${NOFORMAT}"
  exit 1
fi

# Change to the git root directory
cd_to_git_root

# Check if gh (GitHub CLI) is installed
if ! command -v gh &>/dev/null; then
  msg "${RED}Error: GitHub CLI (gh) is not installed or not in PATH${NOFORMAT}"
  msg "Please install it from https://cli.github.com/"
  exit 1
fi

if ! command -v uv &>/dev/null; then
  echo "${RED}Error: 'uv' command is not installed. Please install it and try again.${NC}" >&2
  exit 1
fi

# Get the current branch name
BRANCH_NAME=$(git branch --show-current)
if [ -z "$BRANCH_NAME" ]; then
  msg "${RED}Error: No branch name found${NOFORMAT}"
  exit 1
fi

# Check if there's a PR template in the repository
PR_TEMPLATE_PATHS=(
  ".github/PULL_REQUEST_TEMPLATE.md"
  ".github/pull_request_template.md"
  "docs/PULL_REQUEST_TEMPLATE.md"
  "docs/pull_request_template.md"
  "PULL_REQUEST_TEMPLATE.md"
  "pull_request_template.md"
)

PR_TEMPLATE_PATH=""
for template_path in "${PR_TEMPLATE_PATHS[@]}"; do
  if [ -f "$template_path" ]; then
    PR_TEMPLATE_PATH="$template_path"
    break
  fi
done

# Get the default branch name from the remote

# Use custom base branch if provided
if [ -n "$base_branch" ]; then
  DEFAULT_BRANCH="$base_branch"
  msg "🔀 Using custom base branch: $DEFAULT_BRANCH"
else
  DEFAULT_BRANCH=$(git rev-parse --abbrev-ref origin/HEAD 2>/dev/null | sed 's#^origin/##')
  if [ -z "$DEFAULT_BRANCH" ]; then
    msg "${ORANGE}Warning: Could not determine default branch, using 'main' as fallback${NOFORMAT}"
    DEFAULT_BRANCH="main"
  fi
fi

# Print the current branch name
msg "🐙 Creating PR for branch: $BRANCH_NAME on top of $DEFAULT_BRANCH"
msg "🗒️ Using PR template: $PR_TEMPLATE_PATH"

# Fetch the latest commit messages
msg "⬇️ Fetching latest commit messages from ${NOFORMAT}origin/$DEFAULT_BRANCH"
git fetch origin "$DEFAULT_BRANCH"

# Read the commit messages
COMMIT_MESSAGES=$(git log --pretty=format:"%h %s%n%n%b" origin/"${DEFAULT_BRANCH}".."${BRANCH_NAME}" --no-merges)

# Read the PR template
if [ -n "$PR_TEMPLATE_PATH" ]; then
  PR_TEMPLATE=$(cat "$PR_TEMPLATE_PATH")
else
  PR_TEMPLATE=""
fi

PROMPT="You are tasked with writing a Pull Request (PR) title and body based on commit messages and a PR template. Follow these steps carefully:

First, review the commit messages:
<commit_messages>
$COMMIT_MESSAGES
</commit_messages>

Next, examine the PR template:

<pr_template>
$PR_TEMPLATE
</pr_template>

Now, follow these instructions:

1. Analyze the commit messages:
   - Identify the main theme or purpose of the changes
   - Note any significant features, bug fixes, or improvements
   - Pay attention to the most recent commits, as they are likely the most relevant

2. Generate a PR title:
   - Create a concise, descriptive title that summarizes the main purpose of the changes
   - Use present tense and start with a verb (e.g., \"Add\", \"Fix\", \"Improve\", \"Refactor\")
   - Keep it under 72 characters if possible

3. Fill out the PR body:
   - Use the provided PR template as a guide
   - Fill in each section of the template with relevant information from the commit messages
   - When the information is not available, leave the section empty

4. Format your output:
   - Present the PR title within <pr_title> tags, the open and closing tags should be on their own lines
   - Present the PR body within <pr_body> tags, the open and closing tags should be on their own lines
   - Ensure that the PR body follows the structure of the provided template

Your final output should only include the PR title and body, formatted as specified. Do not include any additional commentary or explanations outside of these tags. Here is an example of the output:

<example>
<pr_title>
Add a new feature
</pr_title>
<pr_body>
The PR description output.
</pr_body>
</example>
"

# Append any extra user-supplied instructions to the prompt
if [ -n "$extra_instructions" ]; then
  PROMPT="$PROMPT
# Extra instructions from user:
$extra_instructions
"
fi

[ "$verbose" -eq 1 ] && msg "${CYAN}Prompt for LLM:${NOFORMAT}\n$PROMPT"

if ! llm_output=$(uvx --with llm-anthropic llm "$PROMPT" --model claude-4-sonnet -o thinking 1); then
  msg "${RED}Error: Failed to generate PR title and body${NOFORMAT}"
  exit 1
fi

[ "$verbose" -eq 1 ] && msg "${CYAN}LLM output:${NOFORMAT}\n$llm_output"

pr_title=$(echo "$llm_output" | awk '/<pr_title>/ {f=1;next} /<\/pr_title>/ {f=0} f')
pr_body=$(echo "$llm_output" | awk '/<pr_body>/ {f=1;next} /<\/pr_body>/ {f=0} f')

msg "🚀 Creating PR with title: $pr_title"

[ "$verbose" -eq 1 ] && [ "${#args[@]}" -gt 0 ] && msg "👉 Passing additional arguments: ${args[*]}"

gh pr create --title "$pr_title" --body "$pr_body" --base "$DEFAULT_BRANCH" --head "$BRANCH_NAME" ${args+"${args[@]}"}
