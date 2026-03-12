---
description: Worker implements, reviewer reviews, and worker applies the feedback
---
Use the subagent tool with the chain parameter to execute this workflow:

1. First, use the `worker` agent to implement: $@
2. Then, use the `reviewer` agent to review the implementation from the previous step with the `{previous}` placeholder
3. Finally, use the `worker` agent to apply the review feedback from the previous step with the `{previous}` placeholder

Execute this as a chain and pass output between steps via `{previous}`.
