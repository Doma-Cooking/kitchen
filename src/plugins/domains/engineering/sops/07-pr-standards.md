# SOP-07: PR Creation & Description

## PR Title

```
<TICKET-ID>: <short description>
```

Example: `KIT-42: add webhook handler for Slack events`

## PR Body Template

```markdown
## Summary

<1-2 sentence description of what this PR does and why.>

## Linear Ticket

<link to Linear ticket>

## Changes

- <bullet point for each meaningful change>
- <group related changes together>

## Testing

<How you verified the changes work. Steps to reproduce, commands run, etc.>
```

## Before Creating a PR

1. Commits are clean and follow SOP-05 format
2. Linters and type checkers pass with zero errors
3. Branch is up to date with the base branch

## After Creating a PR

1. Link the PR to the Linear ticket
2. Update ticket status to **In Review**
3. Request reviewers if known
