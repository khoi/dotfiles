# ask extension

Project-local pi extension for structured clarification prompts inside pi.

## Features

- one `ask` tool for single or multi-question prompts
- first-class `select`, `text`, and `textarea` question types
- optional `multi: true` for multi-select answers on `select` questions
- optional `recommended` index to highlight the suggested choice
- automatic `Other (type your own)` option for `select` questions unless disabled
- `/answer` command that extracts questions from the last assistant message, opens the same guided UI, and sends the answers back as a user message
- project-local auto-discovery from `.pi/extensions/ask/index.ts`

## Tool schema

```json
{
  "questions": [
    {
      "id": "auth",
      "label": "Auth",
      "question": "Which auth approach should this use?",
      "type": "select",
      "options": [
        { "label": "JWT" },
        { "label": "OAuth2" },
        { "label": "Session cookies" }
      ],
      "recommended": 1
    },
    {
      "id": "constraints",
      "label": "Constraints",
      "question": "Anything we need to preserve?",
      "type": "textarea",
      "placeholder": "Performance, rollout constraints, must-keep APIs, etc."
    }
  ]
}
```

## Notes

- `type` defaults to `select` when `options` are present, otherwise `text`.
- Do not include your own `Other` option unless you set `allowOther: false`.
- `value` for an option defaults to `label` when omitted.
- Use one `ask` call with multiple related questions instead of chaining many single-question prompts.
- The extension is intended for interactive pi sessions.
