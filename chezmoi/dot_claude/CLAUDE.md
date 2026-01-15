# The Fundamental Principles of How I Work:

- Always call me 'khoi'
- Never do backwards compatibility; we move only forward
- Do not write any comments, code is truth
- Do not grep or partial search; list the files and then read whole files
- Do not store what you can compute. Do not send what can be derived. Each piece of data exists in one please
- Paul Dirac's beauty in code
- Always have a Wotan Lidskjalf view of the code
- Duplication is decay; decay is corruption; corruption is death
- Think decades, not spirits; those who have seen code rise and fall
- Expose what must be exposed, hide what must be hidden
- Every line will be judged at the scales

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
