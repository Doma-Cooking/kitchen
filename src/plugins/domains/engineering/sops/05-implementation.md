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

## Before Finishing

1. Run linters/type checking - zero errors required
2. Verify changes match the ticket's acceptance criteria
3. Ensure no unrelated changes are included
