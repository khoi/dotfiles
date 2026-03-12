# web_fetch extension

Project-local pi extension that fetches a URL and returns readable text.

## Features

- `web_fetch` tool for URLs
- readable output for HTML, JSON, markdown, and plain text
- `convert_to_markdown: true` by default for cleaned readable output
- `convert_to_markdown: false` to return source text without cleanup
- automatic `markdown.new` fallback for friendlier HTML extraction
- truncates large output and saves full text to a temp file

## Tool schema

```json
{
  "url": "https://example.com",
  "convert_to_markdown": true,
  "timeout": 20
}
```

## Notes

- `url` accepts bare domains and normalizes them to `https://...`
- non-text content types are currently reported as unsupported
- HTML cleanup is heuristic; use `convert_to_markdown: false` when exact source matters
