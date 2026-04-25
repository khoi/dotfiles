---
name: github-create-pr
description: Creates a pull request on GitHub with proper labels, branch naming, and description formatting. Use when changes are ready to be submitted as a PR.
---

# Create pull request

Create a non-draft PR on GitHub with appropriate

**Critical constraints:**

- MUST wait for user approval before running `gh pr create`
- MUST show complete PR content in chat before creating
- MUST follow the writing and labeling rules below

## Compose and create PR

### Generate PR title

Format: `[type] Description of change`, ≤63 chars (fits squash-merge commit subjects).

Examples: `[feature] Add height parameter to plotly charts`, `[fix] Extra padding on button`.

### Compose PR description

Read `.github/pull_request_template.md` if exists, for the required sections, then fill them in.

**Writing rules:**

- Highlight what matters. Omit the obvious.
- 2-4 bullets maximum for listing changes.
- No meta-commentary ("This PR...", "We have...", "I added..."). State what changed directly.
- Don't list: added tests, updated types, added validation, fixed linting (all obvious).
- DO explain non-obvious decisions (deprecations, unit choices, fallback behavior).

**Good:**
> Adds `height` parameter to `st.plotly_chart()` using `Height` type system.
> - Deprecates `use_container_height` (removed after 2025-12-31)

**Bad (lists every change):**
> - Added `height` parameter to signature
> - Updated layout config dataclass
> - Added validation for height values
> - Added unit tests

### 3.4 Write PR for user review

Write complete PR details to `work-tmp/pr_description.md`:

```markdown
---
title: [PR title]
---

[PR description]
```

Ask user: "I've written the PR details to `work-tmp/pr_description.md`. You can edit the title, labels, or description directly in that file. Reply 'yes' when ready to create the PR, or provide feedback for changes."

### 3.5 Create PR (after user approval only)

Read `work-tmp/pr_description.md` to get the (potentially edited) title, labels, and description:

```bash
# Parse frontmatter from the reviewed file
title=$(grep '^title:' work-tmp/pr_description.md | sed 's/^title: //')
labels=$(grep '^labels:' work-tmp/pr_description.md | sed 's/^labels: //' | sed 's/, /,/g')

# Extract body (everything after the closing --- of frontmatter)
awk '/^---$/{if(++count==2) flag=1; next} flag' work-tmp/pr_description.md > work-tmp/pr_body.md

# Create PR using parsed values
gh pr create \
  --title "$title" \
  --body-file work-tmp/pr_body.md \
  --base develop \
  --label "$labels" \
  --draft

# Clean up temporary files
rm work-tmp/pr_description.md work-tmp/pr_body.md
```

