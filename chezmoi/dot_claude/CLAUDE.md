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

- When you need to clone something from GitHub to explore, use `gj get {path_to_git_url}` for instance `gj get git@github.com:ghostty-org/ghostty.git` to do it
- When interacting with GitHub, always use the gh CLI and not the browser
- When creating GitHub issues with gh, never pass a multi-line body as a single quoted string; write the body to a temp file via heredoc and use `gh issue create --body-file` to avoid literal `\n`
- When Git commiting, only add the files related to the change, skip everything else.
- Before commiting, make sure to run lint, check if there is one. Run tests if they're lightweight.
- We want the simplest change possible. We don't care about migration. Code readability matters most, and we're happy to make bigger changes to achieve it.
- When the user asks for a plan, dive deep into the code first before asking clarifying questions using AskUserQuestion tool.
- When writing complex features or significant refactors or user ask explicitly, use the $execplan skill from design to implementation. Ask users clarifying questions using AskUserQuestion tool before finalizing the plan.
- When interacting with Jira (domain contains atlassian.net) use Jira skills
- Never disable lint rules without my permissions

