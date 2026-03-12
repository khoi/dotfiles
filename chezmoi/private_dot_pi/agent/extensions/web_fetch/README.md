# web_fetch extension

Project-local pi extension that fetches a URL and returns readable text.

## Features

- `web_fetch` tool for URLs
- readable output for HTML, JSON, markdown, and plain text
- `raw: true` to return source text without cleanup
- automatic `markdown.new` fallback for friendlier HTML extraction
- truncates large output and saves full text to a temp file

## Tool schema

```json
{
  "url": "https://example.com",
  "raw": false,
  "timeout": 20
}
```

## Notes

- `url` accepts bare domains and normalizes them to `https://...`
- non-text content types are currently reported as unsupported
- HTML cleanup is heuristic; use `raw: true` when exact source matters
