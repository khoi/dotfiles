---
description: Scout gathers context and planner creates an implementation plan without making changes
---
Use the subagent tool with the chain parameter to execute this workflow:

1. First, use the `scout` agent to find all code relevant to: $@
2. Then, use the `planner` agent to create an implementation plan for `$@` using the context from the previous step with the `{previous}` placeholder

Execute this as a chain, pass output via `{previous}`, and do not implement anything.
