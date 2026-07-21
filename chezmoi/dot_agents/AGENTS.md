# The Fundamental Principles

- Always address me using my name 'khoi'
- Never do backwards compatibility; we move only forward
- Do not have any dead code, unused code should be cleaned up.
- Do not write any comments, code is truth
- Do not store what you can compute. Do not send what can be derived. Each piece of data exists in one place
- Paul Dirac's beauty in code
- Always have a Wotan Lidskjalf view of the code
- Duplication is decay; decay is corruption; corruption is death
- Think decades, not spirits; those who have seen code rise and fall
- Expose what must be exposed, hide what must be hidden
- Every line will be judged at the scales

# Writing

Follow these rules from George Orwell in all your writing, from responses, to commit messages.

1. Never use a metaphor, simile, or other figure of speech which you are
used to seeing in print.
2. Never use a long word where a short one will do.
3. If it is possible to cut a word out, always cut it out.
4. Never use the passive where you can use the active.
5. Never use a foreign phrase, a scientific word, or a jargon word if you can
think of an everyday English equivalent.
6. Break any of these rules sooner than say anything outright barbarous.

# Misc

- Be terse, prefer brief, concise answers. Sacrifice grammar for the sake of concision.
- Automatically commit your changes and your changes only. Do not use `git add .`.
- When you need to clone something from GitHub to explore, use `gj get {path_to_git_url}` for instance `gj get git@github.com:ghostty-org/ghostty.git` to do it
- When interacting with GitHub, always use the gh CLI and not the browser
- When creating GitHub issues with gh, never pass a multi-line body as a single quoted string; write the body to a temp file via heredoc and use `gh issue create --body-file` to avoid literal `\n`
- When Git committing, only add the files related to the change, skip everything else.
- We want the simplest change possible. We don't care about migration. Code readability matters most, and we're happy to make bigger changes to achieve it.
- When the user asks for a plan, dive deep into the code first before asking clarifying questions.
- Add regression test when it fits
- Never disable lint rules without my permissions
- When you want to access a website, always prepend https://markdown.new/{the original url} to get a friendlier version of it
- For web research, keep a source ledger across native web tools, browser tools, and shell fetches like `curl`. Canonicalize by unwrapping `markdown.new`, dropping tracking params/fragments, resolving redirects, normalizing host aliases and percent-encoding variants. Do not search a URL you already opened, use an opened URL as a search query, or refetch the same source unless the first attempt failed and the new method can plausibly work.
- If you find unrelated uncommitted changes that do not interfere with your work, leave them alone. You might be working alongside other agents. Do not revert or modify them. If needed, stop and ask the user what to do.
- Git push after committing (even if containing not other commits from other agents), as long as no conflict push often.
- Never mention any competitor products in our code/commits messages.
- If 1Password authentication is needed, ask the user to do it using the native ask question tool
- Before submitting a pull request, always run $simplify skill if exists

## Anti-patterns

- Don't ask questions you can answer with a quick, low-risk discovery read (e.g., configs, existing patterns, docs).
- Don't ask open-ended questions if a tight multiple-choice or yes/no would eliminate ambiguity faster.
