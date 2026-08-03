/* ###
 * Export analysis sections for the current program.
 * Script args select sections; with no args every section is written.
 * @category Export
 */

import ghidra.app.decompiler.DecompInterface;
import ghidra.app.decompiler.DecompileOptions;
import ghidra.app.decompiler.DecompileResults;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.lang.Language;
import ghidra.program.model.listing.Data;
import ghidra.program.model.listing.Function;
import ghidra.program.model.listing.Parameter;
import ghidra.program.model.mem.MemoryBlock;
import ghidra.program.model.symbol.SourceType;
import ghidra.program.model.symbol.Symbol;
import ghidra.program.model.symbol.SymbolTable;

import java.io.File;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.StringJoiner;
import java.util.TreeSet;

public class Export extends GhidraScript {

    private static final List<String> ALL_SECTIONS = List.of(
            "summary", "decompiled", "functions", "strings", "calls", "symbols", "interesting");

    private static final List<String> INTERESTING = List.of(
            "crypt", "aes", "des", "rsa", "md5", "sha", "hmac", "random",
            "password", "passwd", "secret", "token", "auth", "login", "cert",
            "socket", "connect", "send", "recv", "http", "url", "dns",
            "exec", "system", "shell", "spawn", "fork",
            "malloc", "alloc", "memcpy", "strcpy", "sprintf");

    private static final List<String> UNSAFE = List.of(
            "strcpy", "strcat", "sprintf", "vsprintf", "gets", "scanf",
            "system", "popen", "execve", "alloca");

    private File outputDir;
    private String stem;

    @Override
    public void run() throws Exception {
        String dir = System.getenv("GHIDRA_OUTPUT_DIR");
        outputDir = new File(dir == null || dir.isEmpty() ? "." : dir);
        stem = currentProgram.getName().replaceAll("[^a-zA-Z0-9._-]", "_");

        for (String section : requestedSections()) {
            switch (section) {
                case "summary" -> summary();
                case "decompiled" -> decompiled();
                case "functions" -> functions();
                case "strings" -> strings();
                case "calls" -> calls();
                case "symbols" -> symbols();
                case "interesting" -> interesting();
                default -> printerr("Unknown section: " + section);
            }
        }
    }

    private List<String> requestedSections() {
        List<String> requested = new ArrayList<>();
        for (String arg : getScriptArgs()) {
            for (String name : arg.split(",")) {
                String section = name.trim().toLowerCase();
                if (!section.isEmpty()) {
                    requested.add(section);
                }
            }
        }
        return requested.isEmpty() ? ALL_SECTIONS : requested;
    }

    private PrintWriter open(String suffix) throws Exception {
        File file = new File(outputDir, stem + suffix);
        println("Writing " + file.getName());
        return new PrintWriter(new FileWriter(file));
    }

    private void summary() throws Exception {
        try (PrintWriter out = open("_summary.txt")) {
            Language language = currentProgram.getLanguage();
            out.println("File: " + currentProgram.getName());
            out.println("Architecture: " + language.getProcessor());
            out.println("Address size: " + language.getLanguageDescription().getSize() + " bit");
            out.println("Endianness: " + (language.isBigEndian() ? "big" : "little"));
            out.println("Compiler: " + currentProgram.getCompilerSpec().getCompilerSpecID());
            out.println();

            int total = 0;
            int external = 0;
            int thunk = 0;
            for (Function function : allFunctions()) {
                total++;
                if (function.isExternal()) {
                    external++;
                }
                if (function.isThunk()) {
                    thunk++;
                }
            }
            out.println("Functions: " + total + " total, " + external + " external, " + thunk + " thunk");
            out.println();

            out.println("Memory blocks:");
            for (MemoryBlock block : currentProgram.getMemory().getBlocks()) {
                out.println("  " + block.getName()
                        + "  " + block.getStart() + "-" + block.getEnd()
                        + "  " + block.getSize() + " bytes  "
                        + (block.isRead() ? "r" : "-")
                        + (block.isWrite() ? "w" : "-")
                        + (block.isExecute() ? "x" : "-"));
            }
        }
    }

    private void decompiled() throws Exception {
        DecompInterface decompiler = new DecompInterface();
        decompiler.setOptions(new DecompileOptions());
        if (!decompiler.openProgram(currentProgram)) {
            printerr("Decompiler failed to open program: " + decompiler.getLastMessage());
            return;
        }

        try (PrintWriter out = open("_decompiled.c")) {
            out.println("/* " + currentProgram.getName()
                    + " (" + currentProgram.getLanguage().getProcessor() + ") */");
            out.println();

            int done = 0;
            int failed = 0;
            for (Function function : allFunctions()) {
                if (monitor.isCancelled()) {
                    break;
                }
                if (function.isExternal() || function.isThunk()) {
                    continue;
                }
                monitor.setMessage("Decompiling " + function.getName());

                DecompileResults results = decompiler.decompileFunction(function, 30, monitor);
                out.println("/* " + function.getName() + " @ " + function.getEntryPoint() + " */");
                if (results.decompileCompleted()) {
                    out.println(results.getDecompiledFunction().getC());
                    done++;
                } else {
                    out.println("/* decompilation failed: " + results.getErrorMessage() + " */");
                    failed++;
                }
                out.println();
            }
            println("  " + done + " decompiled, " + failed + " failed");
        } finally {
            decompiler.dispose();
        }
    }

    private void functions() throws Exception {
        try (PrintWriter out = open("_functions.json")) {
            out.println("{");
            out.println("  \"program\": " + json(currentProgram.getName()) + ",");
            out.println("  \"architecture\": " + json(currentProgram.getLanguage().getProcessor().toString()) + ",");
            out.println("  \"functions\": [");

            boolean first = true;
            int count = 0;
            for (Function function : allFunctions()) {
                if (monitor.isCancelled()) {
                    break;
                }
                if (!first) {
                    out.println(",");
                }
                first = false;

                out.println("    {");
                out.println("      \"name\": " + json(function.getName()) + ",");
                out.println("      \"address\": " + json(function.getEntryPoint().toString()) + ",");
                out.println("      \"size\": " + function.getBody().getNumAddresses() + ",");
                out.println("      \"signature\": " + json(function.getPrototypeString(false, false)) + ",");
                out.println("      \"returnType\": " + json(function.getReturnType().getDisplayName()) + ",");
                out.println("      \"callingConvention\": " + json(function.getCallingConventionName()) + ",");
                out.println("      \"isExternal\": " + function.isExternal() + ",");
                out.println("      \"isThunk\": " + function.isThunk() + ",");
                out.println("      \"parameters\": [" + parameters(function) + "],");
                out.println("      \"calls\": [" + names(function.getCalledFunctions(monitor)) + "],");
                out.println("      \"calledBy\": [" + names(function.getCallingFunctions(monitor)) + "]");
                out.print("    }");
                count++;
            }

            out.println();
            out.println("  ]");
            out.println("}");
            println("  " + count + " functions");
        }
    }

    private String parameters(Function function) {
        StringJoiner joined = new StringJoiner(", ");
        for (Parameter parameter : function.getParameters()) {
            joined.add("{\"name\": " + json(parameter.getName())
                    + ", \"type\": " + json(parameter.getDataType().getDisplayName()) + "}");
        }
        return joined.toString();
    }

    private String names(Collection<Function> functions) {
        StringJoiner joined = new StringJoiner(", ");
        for (Function function : functions) {
            joined.add(json(function.getName()));
        }
        return joined.toString();
    }

    private void strings() throws Exception {
        try (PrintWriter out = open("_strings.json")) {
            out.println("{");
            out.println("  \"program\": " + json(currentProgram.getName()) + ",");
            out.println("  \"strings\": [");

            boolean first = true;
            int count = 0;
            for (Data data : definedData()) {
                if (monitor.isCancelled()) {
                    break;
                }
                String value = stringValue(data);
                if (value == null || value.length() < 4) {
                    continue;
                }
                if (!first) {
                    out.println(",");
                }
                first = false;

                out.print("    {\"address\": " + json(data.getAddress().toString())
                        + ", \"type\": " + json(data.getDataType().getName())
                        + ", \"length\": " + value.length()
                        + ", \"value\": " + json(truncate(value, 1000)) + "}");
                count++;
            }

            out.println();
            out.println("  ]");
            out.println("}");
            println("  " + count + " strings");
        }
    }

    private String stringValue(Data data) {
        String type = data.getBaseDataType().getName().toLowerCase();
        if (!type.contains("string") && !type.contains("unicode") && !type.equals("char")) {
            return null;
        }
        if (data.getValue() instanceof String text) {
            return text;
        }
        String shown = data.getDefaultValueRepresentation();
        if (shown != null && shown.length() >= 2 && shown.startsWith("\"") && shown.endsWith("\"")) {
            return shown.substring(1, shown.length() - 1);
        }
        return shown;
    }

    private void calls() throws Exception {
        Map<String, String> addresses = new LinkedHashMap<>();
        Map<String, Set<String>> graph = new LinkedHashMap<>();
        for (Function function : allFunctions()) {
            if (monitor.isCancelled()) {
                break;
            }
            Set<String> callees = new TreeSet<>();
            for (Function called : function.getCalledFunctions(monitor)) {
                callees.add(called.getName());
            }
            addresses.put(function.getName(), function.getEntryPoint().toString());
            graph.put(function.getName(), callees);
        }

        Map<String, Integer> callerCounts = new HashMap<>();
        for (Set<String> callees : graph.values()) {
            for (String callee : callees) {
                callerCounts.merge(callee, 1, Integer::sum);
            }
        }

        try (PrintWriter out = open("_calls.json")) {
            out.println("{");
            out.println("  \"program\": " + json(currentProgram.getName()) + ",");
            out.println("  \"callGraph\": {");

            boolean first = true;
            for (Map.Entry<String, Set<String>> entry : graph.entrySet()) {
                if (!first) {
                    out.println(",");
                }
                first = false;

                StringJoiner callees = new StringJoiner(", ");
                for (String callee : entry.getValue()) {
                    callees.add(json(callee));
                }
                out.print("    " + json(entry.getKey())
                        + ": {\"address\": " + json(addresses.get(entry.getKey()))
                        + ", \"calls\": [" + callees + "]}");
            }
            out.println();
            out.println("  },");

            StringJoiner entryPoints = new StringJoiner(", ");
            for (String name : graph.keySet()) {
                if (!callerCounts.containsKey(name)) {
                    entryPoints.add(json(name));
                }
            }
            out.println("  \"potentialEntryPoints\": [" + entryPoints + "],");

            List<Map.Entry<String, Integer>> ranked = new ArrayList<>(callerCounts.entrySet());
            ranked.sort(Map.Entry.<String, Integer>comparingByValue().reversed());
            StringJoiner mostCalled = new StringJoiner(", ");
            for (Map.Entry<String, Integer> entry : ranked.subList(0, Math.min(20, ranked.size()))) {
                mostCalled.add("{\"name\": " + json(entry.getKey())
                        + ", \"count\": " + entry.getValue() + "}");
            }
            out.println("  \"mostCalled\": [" + mostCalled + "]");
            out.println("}");
            println("  " + graph.size() + " functions in call graph");
        }
    }

    private void symbols() throws Exception {
        SymbolTable table = currentProgram.getSymbolTable();
        try (PrintWriter out = open("_symbols.json")) {
            out.println("{");
            out.println("  \"program\": " + json(currentProgram.getName()) + ",");

            out.println("  \"imports\": [");
            boolean first = true;
            int imports = 0;
            for (Symbol symbol : iterate(table.getExternalSymbols())) {
                if (monitor.isCancelled()) {
                    break;
                }
                if (!first) {
                    out.println(",");
                }
                first = false;
                out.print("    " + symbolJson(symbol));
                imports++;
            }
            out.println();
            out.println("  ],");

            out.println("  \"exports\": [");
            first = true;
            int exports = 0;
            for (Function function : allFunctions()) {
                if (monitor.isCancelled()) {
                    break;
                }
                Symbol symbol = function.getSymbol();
                if (!symbol.isExternalEntryPoint() && symbol.getSource() != SourceType.IMPORTED) {
                    continue;
                }
                if (!first) {
                    out.println(",");
                }
                first = false;
                out.print("    {\"name\": " + json(function.getName())
                        + ", \"address\": " + json(function.getEntryPoint().toString())
                        + ", \"signature\": " + json(function.getPrototypeString(false, false)) + "}");
                exports++;
            }
            out.println();
            out.println("  ],");

            out.println("  \"symbols\": [");
            first = true;
            int count = 0;
            for (Symbol symbol : iterate(table.getAllSymbols(true))) {
                if (monitor.isCancelled()) {
                    break;
                }
                if (symbol.getSource() == SourceType.DEFAULT) {
                    continue;
                }
                if (!first) {
                    out.println(",");
                }
                first = false;
                out.print("    " + symbolJson(symbol));
                count++;
            }
            out.println();
            out.println("  ]");
            out.println("}");
            println("  " + imports + " imports, " + exports + " exports, " + count + " symbols");
        }
    }

    private String symbolJson(Symbol symbol) {
        return "{\"name\": " + json(symbol.getName())
                + ", \"address\": " + json(String.valueOf(symbol.getAddress()))
                + ", \"type\": " + json(symbol.getSymbolType().toString())
                + ", \"source\": " + json(symbol.getSource().toString())
                + ", \"namespace\": " + json(symbol.getParentNamespace().getName())
                + ", \"primary\": " + symbol.isPrimary() + "}";
    }

    private void interesting() throws Exception {
        Map<String, List<String>> matches = new LinkedHashMap<>();
        for (Function function : allFunctions()) {
            String name = function.getName().toLowerCase();
            for (String pattern : INTERESTING) {
                if (name.contains(pattern)) {
                    matches.computeIfAbsent(pattern, key -> new ArrayList<>())
                            .add(function.getName() + " @ " + function.getEntryPoint());
                }
            }
        }

        try (PrintWriter out = open("_interesting.txt")) {
            for (Map.Entry<String, List<String>> entry : matches.entrySet()) {
                out.println("[" + entry.getKey() + "]");
                for (String match : entry.getValue()) {
                    out.println("  " + match);
                }
                out.println();
            }

            out.println("[unsafe calls]");
            for (String name : UNSAFE) {
                for (Symbol symbol : iterate(currentProgram.getSymbolTable().getSymbols(name))) {
                    out.println("  " + symbol.getName() + " @ " + symbol.getAddress());
                }
            }
        }
    }

    private Iterable<Function> allFunctions() {
        return iterate(currentProgram.getFunctionManager().getFunctions(true));
    }

    private Iterable<Data> definedData() {
        return iterate(currentProgram.getListing().getDefinedData(true));
    }

    private <T> Iterable<T> iterate(Iterator<T> iterator) {
        return () -> iterator;
    }

    private String truncate(String value, int limit) {
        return value.length() <= limit ? value : value.substring(0, limit) + "...";
    }

    private String json(String value) {
        if (value == null) {
            return "null";
        }
        StringBuilder out = new StringBuilder("\"");
        for (char c : value.toCharArray()) {
            switch (c) {
                case '\\' -> out.append("\\\\");
                case '"' -> out.append("\\\"");
                case '\n' -> out.append("\\n");
                case '\r' -> out.append("\\r");
                case '\t' -> out.append("\\t");
                case '\b' -> out.append("\\b");
                case '\f' -> out.append("\\f");
                default -> {
                    if (c < 32 || c > 126) {
                        out.append(String.format("\\u%04x", (int) c));
                    } else {
                        out.append(c);
                    }
                }
            }
        }
        return out.append('"').toString();
    }
}
