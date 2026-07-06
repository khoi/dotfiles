---
name: github-create-pr
description: Creates a pull request on GitHub with proper labels, branch naming, and description formatting. Use when changes are ready to be submitted as a PR.
---

# Create pull request

**Critical constraints:**

- MUST wait for user approval before running `gh pr create`
- MUST show complete PR content in chat before creating
- MUST follow the writing rules below

## Generate PR title

Same convention as commit subjects: `area: imperative summary`, lowercase
after the colon, ≤72 chars. Area = the package, directory, or subsystem
touched. Omit the prefix only when the change is genuinely cross-cutting.

Examples: `terminal: fix viewport pin during resize reflow`,
`macos: avoid notification publisher retain cycle`.

## Compose PR description

Read `.github/pull_request_template.md` if it exists, for the required
sections, then fill them in. Otherwise write free prose.

**Writing rules:**

- Prose paragraphs explaining why: the problem and how you'd hit it,
  relevant background, root cause, the chosen approach and why not the
  alternatives. Never a bullet restatement of the diff.
- Length proportional to the change: an incremental PR gets two sentences;
  a new subsystem gets a mini design doc.
- Show, don't claim: usage snippets for new APIs, screenshots or recordings
  under a `## Demo` heading for UI changes, an inline repro or verification
  script for bug fixes, numbers for perf claims.
- Call out scope limits explicitly (bold or `> [!NOTE]`): what this PR
  deliberately does not do, with follow-up issues filed.
- Bullets only to enumerate discrete cases (e.g., behavioral changes);
  headers only when a section earns one.
- Link issues: `Fixes #NNN` when closing one, `Related to #NNN` otherwise.
- Credit the reporter when the fix came from someone's report.
- The PR's atomic commits stay meaningful; the description and the commit
  sequence tell the same story. Don't squash the narrative away.

**Good:**

> Embedders that render text outside the terminal grid need to predict how
> many cells a codepoint will occupy. The immediate motivation is IME
> preedit overlay rendering: measuring preedit text with font APIs can
> disagree with the terminal's unicode table, causing the overlay to jump
> when the composed text commits.
>
> This exposes the exact width table the print path already uses, so
> overlays are column-accurate by construction.

**Bad (lists every change):**

> - Added `height` parameter to signature
> - Updated layout config dataclass
> - Added validation for height values
> - Added unit tests

## Write PR for user review

Write complete PR details to `/tmp/pr_description.md`:

```markdown
---
title: [PR title]
---

[PR description]
```

Ask user: "I've written the PR details to `/tmp/pr_description.md`. You can edit the title, labels, or description directly in that file. Reply 'yes' when ready to create the PR, or provide feedback for changes."

## Create PR (after user approval only)

Read `/tmp/pr_description.md` to get the (potentially edited) title, labels, and description:

```bash
# Parse frontmatter from the reviewed file
title=$(grep '^title:' /tmp/pr_description.md | sed 's/^title: //')
labels=$(grep '^labels:' /tmp/pr_description.md | sed 's/^labels: //' | sed 's/, /,/g')

# Extract body (everything after the closing --- of frontmatter)
awk '/^---$/{if(++count==2) flag=1; next} flag' /tmp/pr_description.md > /tmp/pr_body.md

# Create PR using parsed values
gh pr create \
  --title "$title" \
  --body-file /tmp/pr_body.md \
  --label "$labels"

# Clean up temporary files
rm /tmp/pr_description.md /tmp/pr_body.md
```
