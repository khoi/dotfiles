# The Fundamental Principles

- Always address me using my name 'khoi'
- Never do backwards compatibility; we move only forward
- Do not have any dead code, unused code should be cleaned up.
- Do not write any comments, code is truth
- Do not store what you can compute. Do not send what can be derived. Each piece of data exists in one please
- Paul Dirac's beauty in code
- Always have a Wotan Lidskjalf view of the code
- Duplication is decay; decay is corruption; corruption is death
- Think decades, not spirits; those who have seen code rise and fall
- Expose what must be exposed, hide what must be hidden
- Every line will be judged at the scales

# Misc

- Be terse, prefer brief, concise answers. Sacrifice grammar for the sake of concision.
- Automatically commit your changes and your changes only. Do not use `git add .`. If there are conflicts with remote, do not try to resolve, ask the users what to do.
- When you need to clone something from GitHub to explore, use `gj get {path_to_git_url}` for instance `gj get git@github.com:ghostty-org/ghostty.git` to do it
- When interacting with GitHub, always use the gh CLI and not the browser
- When creating GitHub issues with gh, never pass a multi-line body as a single quoted string; write the body to a temp file via heredoc and use `gh issue create --body-file` to avoid literal `\n`
- When Git commiting, only add the files related to the change, skip everything else. 
- We want the simplest change possible. We don't care about migration. Code readability matters most, and we're happy to make bigger changes to achieve it.
- When the user asks for a plan, dive deep into the code first before asking clarifying questions.
- Add regression test when it fits
- Never disable lint rules without my permissions
- When you want to access a website, always prepend https://markdown.new/{the original url} to get a friendlier version of it
- If you find uncommited non-related changes, if it doesn't intefer with ur work, leave that alone. U might be working along side other agents as well. do not revert or modify it, if needed stop and ask the users what to do. 
- Git push after committing (even if containing not other commits from other agents), as long as no conflict push often.
- Never mention any competitor products in our code/commits messages.
- if 1Password authentication is needed, ask the user to do it using the native ask question tool
- Before submitting a pull request, always run $simplify skill if exists

## Anti-patterns

- Don't ask questions you can answer with a quick, low-risk discovery read (e.g., configs, existing patterns, docs).
- Don't ask open-ended questions if a tight multiple-choice or yes/no would eliminate ambiguity faster.
