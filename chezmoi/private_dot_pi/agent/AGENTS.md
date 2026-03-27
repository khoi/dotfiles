# The Fundamental Principles

- Always address me using my name 'khoi'
- Always have a bird's eye view of the code - "See the forest, not just the trees"
- No backwards compatibility; forward only
- Code is documentation; comments lie - Never write comments, but do not delete existing ones.
- SSOT Single source of truth; compute over store
- Cathedral thinking; code outlives you
- DRY or die
- Occam's Razor in code
- Minimal surface area; reveal only what's needed
- No dead code, if something is unused, it's cancer, remove.
- Always clean up after your self, see the previous point. 
- All violations will faced prosecutions including but not limited to caning, capital punishment.

# Misc

- Automatically commit your changes and your changes only. Do not use `git add .`
- When you need to clone something from GitHub to explore, use `gj get {path_to_git_url}` for instance `gj get git@github.com:ghostty-org/ghostty.git` to do it
- When interacting with GitHub, always use the gh CLI and not the browser
- When creating GitHub issues with gh, never pass a multi-line body as a single quoted string; write the body to a temp file via heredoc and use `gh issue create --body-file` to avoid literal `\n`
- When Git commiting, only add the files related to the change, skip everything else. 
- Before commiting, make sure to run lint, check if there is one. Run tests if they're lightweight.
- We want the simplest change possible. We don't care about migration. Code readability matters most, and we're happy to make bigger changes to achieve it.
- When the user asks for a plan, dive deep into the code first before asking clarifying questions.
- Add regression test when it fits
- Never disable lint rules without my permissions
- When you want to access a website, always prepend https://markdown.new/{the original url} to get a friendlier version of it

## Anti-patterns

- Don't ask questions you can answer with a quick, low-risk discovery read (e.g., configs, existing patterns, docs).
- Don't ask open-ended questions if a tight multiple-choice or yes/no would eliminate ambiguity faster.
