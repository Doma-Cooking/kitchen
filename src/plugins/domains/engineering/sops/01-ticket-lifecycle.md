# SOP-01: Ticket Lifecycle

## States

All engineering work follows this lifecycle in Linear:

```
Backlog → Todo → In Progress → In Review → Done
```

## Transition Rules

### Backlog → Todo
- Ticket has been triaged and prioritized
- Required fields are present: title, description, acceptance criteria, team, priority

### Todo → In Progress
- Engineer is actively working on the ticket
- All required fields are present. If anything is missing, follow SOP-04 (Clarification Protocol) before starting
- For non-trivial work, a tech plan should be created first (see SOP-03)

### In Progress → In Review
- A PR has been created and linked to the ticket
- PR follows SOP-07 standards

### In Review → Done
- PR has been approved and merged
- No outstanding review comments

## Required Fields Before Starting Work

Before transitioning a ticket to "In Progress", verify:

1. **Title** — concise, action-oriented
2. **Description** — clear background and context
3. **Acceptance criteria** — measurable definition of done
4. **Team** — assigned team
5. **Priority** — set by product or engineering lead

If any of these are missing, follow SOP-04 to request clarification before proceeding.
