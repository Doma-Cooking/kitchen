---
name: implementation
description: Implement a planned ticket. Use when asked to implement, code, build, or ship a feature or fix.
---

# Implementation Skill

## Reference Standards

!cat ${CLAUDE_SKILL_DIR}/../../sops/05-implementation.md

!cat ${CLAUDE_SKILL_DIR}/../../sops/06-git-branching.md

!cat ${CLAUDE_SKILL_DIR}/../../sops/07-pr-standards.md

## Workflow

You are executing the implementation workflow. Follow these steps in order:

### 1. Locate the Tech Plan

Check if a tech plan exists for this ticket:
- Check if the implementation ticket has a parent ticket in Linear — if so, look for a merged `plans/<parent-ticket-id>-*.md` in the repo
- If a tech plan exists, read it before starting
- If no tech plan exists and the work is non-trivial, run the `/planning` skill first
- For trivial changes, proceed without a tech plan

### 2. Create Branch

Per SOP-06:
- Branch from the repo's default branch
- Name: `<ticket-id>/<short-description>` (kebab-case)

### 3. Implement

Per SOP-05:
- Follow existing patterns in the repo
- Make small, focused commits
- Commit format: `<TICKET-ID>: <description>`
- Stay focused on the ticket's scope

### 4. Verify

Before creating a PR:
- Run linting/type checking — zero errors required
- Verify changes match the ticket's acceptance criteria
- Ensure no unrelated changes are included

### 5. Create PR

Per SOP-07:
- Title: `<TICKET-ID>: <short description>`
- Body includes: Summary, Linear Ticket link, Changes, Testing
- Use `github_create_pull_request`

### 6. Update Ticket

- Link the PR to the Linear ticket
- Set ticket status to **In Review** (`linear_update_issue`)

### 7. Report

Share the PR URL and confirm the ticket has been updated.
