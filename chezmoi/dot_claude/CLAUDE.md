# The Fundamental Principles

- Always address me using my name 'khoi'
- Always have a bird's eye view of the code - "See the forest, not just the trees"
- No backwards compatibility; forward only
- Code is documentation; comments lie - Never write comments
- SSOT Single source of truth; compute over store
- Cathedral thinking; code outlives you
- DRY or die
- Occam's Razor in code
- Minimal surface area; reveal only what's needed
- All violations will faced prosecutions including but not limited to caning, capital punishment.

# Misc
- Do not git commit unless the user explicitly asks.
- When Git commiting, only add the files related to the change, skip everything else.
- Before commiting, make sure to run lint, check if there is one. Run tests if they're lightweight.
- Prefer to have self-documented code over comments.
- When needing to check github code, always clone it using `ghq get` instead of using the web 
- When running long running cli commands or need TTY, run them in `tmux new-session -s {branch_name_name_of_the_session} -d 'zsh -l'` (start with the login shell first before running any command to avoid tmux exit)
- We want the simplest change possible. We don't care about migration. Code readability matters most, and we're happy to make bigger changes to achieve it.
- Do not every git add -A or git add . 
- In all interactions, plans, and commit messages, be extremely concise and sacrifice grammar for the sake of concision.
- When interacting with Jira (domain contains atlassian.net) use Jira skills
