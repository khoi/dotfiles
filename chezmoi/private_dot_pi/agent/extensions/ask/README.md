# ask extension

Project-local pi extension that ports the core `ask` workflow from oh-my-pi.

## Features

- single or multi-question prompts via one `ask` tool
- optional `multi: true` per question for multi-select answers
- optional `recommended` index to highlight the default choice
- automatic `Other (type your own)` option
- project-local auto-discovery from `.pi/extensions/ask/index.ts`

## Tool schema

```json
{
  "questions": [
    {
      "id": "auth",
      "question": "Which auth approach should this use?",
      "options": [
        { "label": "JWT" },
        { "label": "OAuth2" },
        { "label": "Session cookies" }
      ],
      "recommended": 0
    }
  ]
}
```

## Notes

- Do not include an `Other` option yourself; the UI adds it automatically.
- Use one `ask` call with multiple related questions instead of chaining many single-question prompts.
- The extension is intended for interactive pi sessions.
