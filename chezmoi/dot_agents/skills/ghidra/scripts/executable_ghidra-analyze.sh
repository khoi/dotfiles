#!/usr/bin/env bash
# Run Ghidra's headless analyzer over a binary and write the requested export sections.
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

output_dir="."
sections=""
processor=""
cspec=""
analysis_timeout=""
no_analysis=false
keep_project=false
verbose=false
binary=""

usage() {
    cat <<'EOF'
Usage: ghidra-analyze.sh [options] <binary>

Options:
  -o, --output <dir>       Where to write results (default: current directory)
  -s, --sections <list>    Comma-separated subset of:
                           summary,decompiled,functions,strings,calls,symbols,interesting
                           (default: all of them)
  -p, --processor <id>     Force architecture, e.g. ARM:LE:32:v7
  -c, --cspec <id>         Force compiler spec, e.g. gcc, windows
      --no-analysis        Skip auto-analysis: fast, but far less information
      --timeout <seconds>  Cap analysis time for the binary
      --keep-project       Keep the Ghidra project directory and print its path
  -v, --verbose            Print the analyzeHeadless command before running it
  -h, --help               Show this help

Environment:
  GHIDRA_HOME  Ghidra installation to use
  JAVA_HOME    JDK to run Ghidra with; derived from Homebrew when unset
  MAXMEM       Analyzer heap, e.g. 4G
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -o | --output) output_dir="$2"; shift 2 ;;
        -s | --sections) sections="$2"; shift 2 ;;
        -p | --processor) processor="$2"; shift 2 ;;
        -c | --cspec) cspec="$2"; shift 2 ;;
        --no-analysis) no_analysis=true; shift ;;
        --timeout) analysis_timeout="$2"; shift 2 ;;
        --keep-project) keep_project=true; shift ;;
        -v | --verbose) verbose=true; shift ;;
        -h | --help) usage; exit 0 ;;
        -*) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
        *) binary="$1"; shift ;;
    esac
done

if [[ -z "$binary" ]]; then
    echo "Error: no binary given" >&2
    usage >&2
    exit 1
fi

if [[ ! -f "$binary" ]]; then
    echo "Error: no such file: $binary" >&2
    exit 1
fi

analyze_headless="$("$script_dir/find-ghidra.sh")"

# Homebrew keeps its JDK keg-only, and macOS ships a /usr/bin/java stub that
# resolves but never runs, so ask java to identify itself rather than trusting PATH.
if [[ -z "${JAVA_HOME:-}" ]] && ! java -version > /dev/null 2>&1; then
    if jdk=$(brew --prefix "$(brew deps ghidra | grep -m1 '^openjdk')" 2>/dev/null); then
        for candidate in "$jdk/libexec/openjdk.jdk/Contents/Home" "$jdk/libexec"; do
            if [[ -x "$candidate/bin/java" ]]; then
                export JAVA_HOME="$candidate"
                break
            fi
        done
    fi
fi

mkdir -p "$output_dir"
output_dir="$(cd "$output_dir" && pwd)"

project_dir="$(mktemp -d)"
if [[ "$keep_project" == true ]]; then
    echo "Ghidra project: $project_dir"
else
    trap 'rm -rf "$project_dir"' EXIT
fi

command=(
    "$analyze_headless" "$project_dir" analysis
    -import "$binary"
    -scriptPath "$script_dir/ghidra_scripts"
    -postScript Export.java
)

if [[ -n "$sections" ]]; then
    command+=("$sections")
fi
if [[ -n "$processor" ]]; then
    command+=(-processor "$processor")
fi
if [[ -n "$cspec" ]]; then
    command+=(-cspec "$cspec")
fi
if [[ -n "$analysis_timeout" ]]; then
    command+=(-analysisTimeoutPerFile "$analysis_timeout")
fi
if [[ "$no_analysis" == true ]]; then
    command+=(-noanalysis)
fi
command+=(-log "$output_dir/ghidra.log")

if [[ "$verbose" == true ]]; then
    printf 'Running:'
    printf ' %q' "${command[@]}"
    printf '\n'
fi

GHIDRA_OUTPUT_DIR="$output_dir" "${command[@]}"

echo
echo "Results in $output_dir"
ls -1 "$output_dir"
