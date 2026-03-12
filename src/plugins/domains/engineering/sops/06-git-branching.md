# SOP-06: Git & Branch Management

## Branch Naming

```
<ticket-id>/<short-description>
```

- Use kebab-case for the description
- Example: `KIT-42/add-webhook-handler`

## Branching Rules

- **Branch from the repo's default branch.** The default branch is provided in agent context — do not hardcode `main` or `master`.
- **One branch per ticket.** Keep the branch focused on a single piece of work.
- **Commit frequently.** Small, atomic commits are easier to review and revert.

## Force Push

- **No force push** unless rebasing to resolve conflicts with the base branch.
- If you must force push, ensure no one else is working on the branch.
