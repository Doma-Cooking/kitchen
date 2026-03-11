# SOP-02: Ticket Creation Standards

## Principle

All work must be tracked. No work without a ticket.

## Required Fields

Every ticket must include:

- **Title** — concise, action-oriented (e.g. "Add webhook handler for Slack events")
- **Description** — background/context, requirements/acceptance criteria, technical notes (if any)
- **Team** — the owning team
- **Priority** — urgency and importance

## Description Structure

```
## Background
<Why this work is needed. Link to related tickets or discussions.>

## Requirements
<What needs to be done. Acceptance criteria as a checklist.>

## Technical Notes
<Optional. Architecture considerations, constraints, relevant code pointers.>
```

## Labels & Tags

Apply labels when relevant context exists (e.g. `bug`, `feature`, `tech-debt`, `infra`). Don't over-label — use them when they aid filtering and triage.

## Sub-tickets

Break work into sub-tickets when:
- A feature has distinct, independently deliverable parts
- A tech plan is needed (tech plan ticket + implementation ticket)
- Work spans multiple repos or domains

## Tech Plan Tickets

When a tech plan is required (see SOP-03):
- Create a child/related ticket to the parent feature ticket
- Title format: `<PARENT-ID>: Tech Plan — <description>`
- The tech plan ticket tracks the planning work itself (writing the plan, PR review)
- The parent ticket tracks the overall feature/work
