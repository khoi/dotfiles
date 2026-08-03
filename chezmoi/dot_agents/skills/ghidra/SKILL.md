---
name: ghidra
description: Reverse engineer binaries with Ghidra's headless analyzer. Use when decompiling an executable to C, extracting functions, strings or symbols, mapping a call graph, or triaging firmware and unknown binaries without the Ghidra GUI.
allowed-tools:
  - Bash
  - Read
  - Grep
  - Glob
---

# Ghidra Headless

Drive Ghidra's `analyzeHeadless` from the shell: import a binary, analyse it, and
write the results as C and JSON.

`$SKILL_DIR` below is the directory holding this file.

## Use this when

- Decompiling a binary to C pseudocode
- Pulling function signatures, strings, or symbols out of an executable
- Mapping a call graph to understand control flow
- Triaging unknown binaries or firmware images
- Auditing compiled code with no source available

## Use something else when

- Source is available: read it
- You need to step through execution: LLDB, GDB, or the Ghidra GUI
- It is a .NET assembly: dnSpy or ILSpy
- It is Java bytecode: jadx or cfr

## Install

```bash
brew install ghidra
```

Ghidra is a Homebrew **formula**, not a cask; `brew install --cask ghidra` fails.
The formula pulls in its own OpenJDK, which Homebrew keeps keg-only, so `java`
stays off `PATH` and Ghidra's launcher cannot find it. `ghidra-analyze.sh` derives
`JAVA_HOME` from the formula when you have not set one, so no extra setup is
needed. Elsewhere, download from https://ghidra-sre.org/ and set `GHIDRA_HOME`.

Check what will be used:

```bash
"$SKILL_DIR/scripts/find-ghidra.sh"
```

## Run

```bash
"$SKILL_DIR/scripts/ghidra-analyze.sh" -o ./analysis <binary>
```

That writes every section. Narrow it with `-s` when you only need part, which is
much faster on large binaries:

```bash
"$SKILL_DIR/scripts/ghidra-analyze.sh" -s strings,symbols -o ./analysis <binary>
```

| Option | Meaning |
|--------|---------|
| `-o, --output <dir>` | Where results land (default: current directory) |
| `-s, --sections <list>` | Comma-separated subset of the sections below |
| `-p, --processor <id>` | Force architecture, e.g. `ARM:LE:32:v7` |
| `-c, --cspec <id>` | Force compiler spec, e.g. `gcc`, `windows` |
| `--no-analysis` | Skip auto-analysis: fast, far less information |
| `--timeout <seconds>` | Cap analysis time for the binary |
| `--keep-project` | Keep the Ghidra project and print its path |
| `-v, --verbose` | Print the `analyzeHeadless` command first |

`GHIDRA_HOME`, `JAVA_HOME`, and `MAXMEM` (analyzer heap, e.g. `4G`) are read from
the environment.

## Sections

Every file is named after the binary. `ghidra.log` holds the analyzer log.

| Section | File | Contents |
|---------|------|----------|
| `summary` | `_summary.txt` | Architecture, endianness, compiler, function counts, memory blocks |
| `decompiled` | `_decompiled.c` | Every non-thunk function as C pseudocode |
| `functions` | `_functions.json` | Signatures, parameters, calls, callers |
| `strings` | `_strings.json` | Strings of 4+ characters with addresses |
| `calls` | `_calls.json` | Call graph, likely entry points, most-called functions |
| `symbols` | `_symbols.json` | Imports, exports, named symbols |
| `interesting` | `_interesting.txt` | Functions matching crypto, network, and memory patterns; unsafe calls |

`_functions.json`:

```json
{
  "program": "example.exe",
  "architecture": "x86",
  "functions": [
    {
      "name": "main",
      "address": "00401000",
      "size": 256,
      "signature": "int main(int argc, char **argv)",
      "returnType": "int",
      "callingConvention": "cdecl",
      "isExternal": false,
      "isThunk": false,
      "parameters": [{"name": "argc", "type": "int"}],
      "calls": ["printf", "malloc"],
      "calledBy": ["_start"]
    }
  ]
}
```

## Workflows

Triage an unknown binary:

```bash
"$SKILL_DIR/scripts/ghidra-analyze.sh" -o ./analysis unknown_binary
cat ./analysis/unknown_binary_summary.txt
cat ./analysis/unknown_binary_interesting.txt
```

Hunt for memory-safety bugs:

```bash
"$SKILL_DIR/scripts/ghidra-analyze.sh" -s decompiled -o ./analysis target
grep -n 'strcpy\|sprintf\|gets\|memcpy' ./analysis/target_decompiled.c
```

Firmware, where auto-detection usually guesses wrong:

```bash
"$SKILL_DIR/scripts/ghidra-analyze.sh" -p "ARM:LE:32:v7" -o ./analysis firmware.bin
```

Query the JSON with `jq`:

```bash
jq -r '.functions[] | "\(.address) \(.name)"' ./analysis/target_functions.json
jq -r '.mostCalled[] | "\(.count)\t\(.name)"' ./analysis/target_calls.json
```

## Architectures

| Architecture | `-p` value |
|--------------|-----------|
| x86 32-bit | `x86:LE:32:default` |
| x86 64-bit | `x86:LE:64:default` |
| ARM 32-bit | `ARM:LE:32:v7` |
| ARM 64-bit | `AARCH64:LE:64:v8A` |
| MIPS 32-bit | `MIPS:BE:32:default` or `MIPS:LE:32:default` |
| PowerPC | `PowerPC:BE:32:default` |

List everything the installed Ghidra supports:

```bash
ls "$(dirname "$("$SKILL_DIR/scripts/find-ghidra.sh")")/../Ghidra/Processors"
```

## Notes

- Decompilation is a guide, not ground truth. Cross-check against disassembly
  before acting on anything surprising.
- Large binaries are slow. Reach for `-s` and `--timeout` before `--no-analysis`,
  which skips the analysis that makes the output worth reading.
- Out of memory means `MAXMEM=4G`.
