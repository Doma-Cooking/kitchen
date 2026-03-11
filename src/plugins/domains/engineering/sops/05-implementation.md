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

**Use MCP tools, not CLI tools.** The runtime environment does not have `gh`, `curl`, or similar CLI tools installed. GitHub App credentials (`GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, `GITHUB_INSTALLATION_ID`) are available but no `GITHUB_TOKEN`.

Always use the GitHub MCP tools provided by the engineering plugin for all GitHub API operations:
- PR creation, review, commenting → `github_create_pull_request`, `github_add_pr_comment`, `github_list_pr_reviews`
- File reads → `github_get_file_contents`
- Branch/PR listing → `github_list_branches`, `github_list_pull_requests`

For operations not covered by the MCP tools (e.g. fetching inline PR review comments), use Node.js's built-in `https` module with a GitHub App JWT. See the kitchen codebase's `tools/github.ts` for the auth pattern.

## Before Finishing

1. Run linters/type checking - zero errors required
2. Verify changes match the ticket's acceptance criteria
3. Ensure no unrelated changes are included
