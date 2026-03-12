# SOP-05: Implementation Standards

## Principles

- **Follow existing patterns** in the repo. Match the style, structure, and conventions already in use.
- **Keep changes focused.** One ticket, one concern per PR.

## Commit Format

```
<TICKET-ID>: <description>
```

Example: `KIT-42: add webhook handler for Slack events`

- Use lowercase descriptions
- Keep the first line under 72 characters
- Be specific about what changed

## GitHub Operations

**Use MCP tools, not CLI tools.** The runtime environment does not have `gh`, `curl`, or similar CLI tools installed. Git push authentication is handled automatically — just use `git push` directly.

Always use the GitHub MCP tools provided by the engineering plugin for all GitHub API operations. If a needed operation isn't covered, add a new tool to `tools/github.ts` following the existing patterns.

## Before Finishing

1. Run linters/type checking - zero errors required
2. Verify changes match the ticket's acceptance criteria
3. Ensure no unrelated changes are included
