import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
  formatSize,
  type TruncationResult,
  truncateHead,
} from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";

const DEFAULT_TIMEOUT_SECONDS = 20;
const MIN_TIMEOUT_SECONDS = 1;
const MAX_TIMEOUT_SECONDS = 60;
const ACCEPT_HEADER = [
  "text/html",
  "application/xhtml+xml",
  "application/json",
  "text/markdown",
  "text/plain;q=0.9",
  "*/*;q=0.5",
].join(", ");

const HtmlEntityMap: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

const WebFetchParams = Type.Object({
  url: Type.String({ description: "URL to fetch" }),
  raw: Type.Optional(Type.Boolean({ description: "Return the raw response text without cleanup" })),
  timeout: Type.Optional(Type.Number({ description: "Timeout in seconds (default: 20)" })),
});

type WebFetchMode = "raw" | "markdown" | "html" | "json" | "text" | "unsupported";

interface FetchPayload {
  body: string;
  contentType: string;
  fetchedUrl: string;
  status: number;
}

interface WebFetchDetails {
  url: string;
  fetchedUrl: string;
  status: number;
  contentType: string;
  mode: WebFetchMode;
  raw: boolean;
  viaMarkdownProxy?: boolean;
  markdownProxyUrl?: string;
  truncation?: TruncationResult;
  fullOutputPath?: string;
}

function clampTimeout(timeout?: number): number {
  if (typeof timeout !== "number" || !Number.isFinite(timeout)) return DEFAULT_TIMEOUT_SECONDS;
  return Math.max(MIN_TIMEOUT_SECONDS, Math.min(MAX_TIMEOUT_SECONDS, Math.round(timeout)));
}

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("URL must not be empty");
  const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return new URL(normalized).toString();
}

function normalizeContentType(contentType: string | null): string {
  return contentType?.split(";")[0]?.trim().toLowerCase() ?? "";
}

function isJsonContentType(contentType: string): boolean {
  return contentType.includes("json");
}

function isMarkdownContentType(contentType: string): boolean {
  return contentType.includes("markdown") || contentType === "text/x-markdown";
}

function isHtmlContentType(contentType: string): boolean {
  return contentType === "text/html" || contentType === "application/xhtml+xml";
}

function isTextLikeContentType(contentType: string): boolean {
  if (!contentType) return true;
  if (contentType.startsWith("text/")) return true;
  return (
    contentType.includes("json") ||
    contentType.includes("xml") ||
    contentType.includes("javascript") ||
    contentType.includes("yaml") ||
    contentType.includes("csv") ||
    contentType.includes("graphql")
  );
}

function looksLikeHtml(body: string): boolean {
  const sample = body.trim().slice(0, 300).toLowerCase();
  return (
    sample.startsWith("<!doctype html") ||
    sample.startsWith("<html") ||
    sample.includes("<body") ||
    sample.includes("<main") ||
    sample.includes("<article")
  );
}

function looksLikeJson(body: string): boolean {
  const trimmed = body.trim();
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

function markdownProxyUrl(url: string): string {
  return `https://markdown.new/${url}`;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_match, value) => String.fromCodePoint(parseInt(value, 16)))
    .replace(/&#(\d+);/g, (_match, value) => String.fromCodePoint(parseInt(value, 10)))
    .replace(/&([a-z]+);/gi, (match, entity) => HtmlEntityMap[entity.toLowerCase()] ?? match)
    .replace(/\u00a0/g, " ");
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = match?.[1] ? normalizeWhitespace(decodeHtmlEntities(match[1].replace(/<[^>]+>/g, " "))) : "";
  return title || undefined;
}

function htmlToText(html: string): string {
  const title = extractTitle(html);
  const body = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|template|svg)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/?(p|div|section|article|main|header|footer|aside|nav|pre|blockquote|table|tr|ul|ol|h1|h2|h3|h4|h5|h6)[^>]*>/gi, "\n\n")
    .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_match, href, label) => {
      const text = normalizeWhitespace(decodeHtmlEntities(String(label).replace(/<[^>]+>/g, " ")));
      return text ? `${text} (${href})` : href;
    })
    .replace(/<img[^>]*alt=["']([^"']*)["'][^>]*>/gi, (_match, alt) => (alt ? `[Image: ${alt}]` : " "))
    .replace(/<[^>]+>/g, " ");
  const text = normalizeWhitespace(decodeHtmlEntities(body));
  if (title && text && !text.toLowerCase().startsWith(title.toLowerCase())) {
    return `# ${title}\n\n${text}`;
  }
  return text || title || "";
}

function formatProcessedBody(body: string, contentType: string, raw: boolean): { mode: WebFetchMode; text: string } {
  if (raw) {
    return { mode: "raw", text: body.trim() };
  }

  if (isJsonContentType(contentType) || looksLikeJson(body)) {
    try {
      return {
        mode: "json",
        text: JSON.stringify(JSON.parse(body), null, 2),
      };
    } catch {
      return { mode: "json", text: normalizeWhitespace(body) };
    }
  }

  if (isMarkdownContentType(contentType)) {
    return { mode: "markdown", text: normalizeWhitespace(body) };
  }

  if (isHtmlContentType(contentType) || looksLikeHtml(body)) {
    return { mode: "html", text: htmlToText(body) };
  }

  return { mode: "text", text: normalizeWhitespace(body) };
}

async function fetchText(url: string, timeoutSeconds: number, signal?: AbortSignal): Promise<FetchPayload> {
  const timeoutSignal = AbortSignal.timeout(timeoutSeconds * 1000);
  const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
  const response = await fetch(url, {
    headers: {
      Accept: ACCEPT_HEADER,
      "User-Agent": "pi-web_fetch/1.0",
    },
    redirect: "follow",
    signal: combinedSignal,
  });

  const contentType = normalizeContentType(response.headers.get("content-type"));

  if (!response.ok) {
    let message = `Request failed with HTTP ${response.status}`;
    if (isTextLikeContentType(contentType)) {
      const excerpt = normalizeWhitespace(await response.text()).slice(0, 300);
      if (excerpt) message += `: ${excerpt}`;
    } else {
      try {
        await response.body?.cancel();
      } catch {}
    }
    throw new Error(message);
  }

  if (contentType && !isTextLikeContentType(contentType)) {
    try {
      await response.body?.cancel();
    } catch {}
    return {
      body: "",
      contentType,
      fetchedUrl: response.url,
      status: response.status,
    };
  }

  return {
    body: await response.text(),
    contentType,
    fetchedUrl: response.url,
    status: response.status,
  };
}

async function tryMarkdownProxy(url: string, timeoutSeconds: number, signal?: AbortSignal): Promise<FetchPayload | null> {
  const proxyUrl = markdownProxyUrl(url);
  try {
    const payload = await fetchText(proxyUrl, timeoutSeconds, signal);
    const text = normalizeWhitespace(payload.body);
    if (!text) return null;
    return { ...payload, body: text };
  } catch {
    return null;
  }
}

function createTempOutputFile(content: string): string {
  const dir = mkdtempSync(join(tmpdir(), "pi-web-fetch-"));
  const filePath = join(dir, "output.txt");
  writeFileSync(filePath, content);
  return filePath;
}

export default function webFetch(pi: ExtensionAPI) {
  pi.registerTool({
    name: "web_fetch",
    label: "Web Fetch",
    description: `Fetch a URL and return readable content. Supports HTML, JSON, markdown, and plain text. Output is truncated to ${DEFAULT_MAX_LINES} lines or ${formatSize(DEFAULT_MAX_BYTES)}.`,
    promptSnippet: "Fetch a URL and return cleaned readable content for HTML, JSON, markdown, or plain text.",
    promptGuidelines: [
      "Use this tool when the user provides a URL or asks you to inspect a specific web page.",
      "Prefer this tool over bash/curl for reading web content.",
      "Use raw:true only when exact source response text matters more than readability.",
    ],
    parameters: WebFetchParams,

    async execute(_toolCallId, params, signal) {
      const url = normalizeUrl(params.url);
      const timeoutSeconds = clampTimeout(params.timeout);
      const raw = params.raw === true;

      const primary = await fetchText(url, timeoutSeconds, signal);
      let processed = formatProcessedBody(primary.body, primary.contentType, raw);
      let viaMarkdownProxy = false;
      let proxyUrl: string | undefined;

      if (!raw && processed.mode === "html" && new URL(url).hostname !== "markdown.new") {
        const proxied = await tryMarkdownProxy(url, timeoutSeconds, signal);
        if (proxied) {
          processed = { mode: "markdown", text: proxied.body };
          viaMarkdownProxy = true;
          proxyUrl = proxied.fetchedUrl;
        }
      }

      if (!processed.text) {
        processed = {
          mode: primary.contentType && !isTextLikeContentType(primary.contentType) ? "unsupported" : processed.mode,
          text:
            primary.contentType && !isTextLikeContentType(primary.contentType)
              ? `Unsupported content type: ${primary.contentType}`
              : "(empty response)",
        };
      }

      const output = processed.text;
      const truncation = truncateHead(output, {
        maxBytes: DEFAULT_MAX_BYTES,
        maxLines: DEFAULT_MAX_LINES,
      });

      const details: WebFetchDetails = {
        url,
        fetchedUrl: primary.fetchedUrl,
        status: primary.status,
        contentType: primary.contentType || "unknown",
        mode: processed.mode,
        raw,
        viaMarkdownProxy,
        markdownProxyUrl: proxyUrl,
      };

      let resultText = truncation.content;
      if (truncation.truncated) {
        const fullOutputPath = createTempOutputFile(output);
        details.truncation = truncation;
        details.fullOutputPath = fullOutputPath;
        resultText += `\n\n[Output truncated: showing ${truncation.outputLines} of ${truncation.totalLines} lines (${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)}). Full output saved to: ${fullOutputPath}]`;
      }

      return {
        content: [{ type: "text", text: resultText }],
        details,
      };
    },

    renderCall(args, theme) {
      let text = theme.fg("toolTitle", theme.bold("web_fetch ")) + theme.fg("accent", args.url);
      if (args.raw === true) {
        text += theme.fg("warning", " raw");
      }
      if (typeof args.timeout === "number") {
        text += theme.fg("dim", ` ${Math.round(args.timeout)}s`);
      }
      return new Text(text, 0, 0);
    },

    renderResult(result, { expanded, isPartial }, theme) {
      if (isPartial) {
        return new Text(theme.fg("warning", "Fetching..."), 0, 0);
      }

      const details = result.details as WebFetchDetails | undefined;
      if (!details) {
        const content = result.content[0];
        return new Text(content?.type === "text" ? content.text : "", 0, 0);
      }

      let text = theme.fg("success", `${details.status}`);
      text += theme.fg("muted", ` ${details.mode}`);
      text += theme.fg("dim", ` ${details.contentType}`);
      if (details.viaMarkdownProxy) {
        text += theme.fg("accent", " via markdown.new");
      }
      if (details.truncation?.truncated) {
        text += theme.fg("warning", " truncated");
      }

      if (expanded) {
        const content = result.content[0];
        if (content?.type === "text") {
          const previewLines = content.text.split("\n").slice(0, 20);
          text += `\n${theme.fg("dim", previewLines.join("\n"))}`;
        }
        if (details.fullOutputPath) {
          text += `\n${theme.fg("muted", details.fullOutputPath)}`;
        }
      }

      return new Text(text, 0, 0);
    },
  });
}
