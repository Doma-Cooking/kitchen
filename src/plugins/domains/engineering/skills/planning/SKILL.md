---
name: planning
description: Plan implementation for a ticket. Use when asked to plan, design, or scope engineering work.
---

# Planning Skill

## Reference Standards

!cat ${CLAUDE_SKILL_DIR}/../../sops/01-ticket-lifecycle.md

!cat ${CLAUDE_SKILL_DIR}/../../sops/02-ticket-creation.md

!cat ${CLAUDE_SKILL_DIR}/../../sops/03-tech-plan.md

!cat ${CLAUDE_SKILL_DIR}/../../sops/04-clarification.md

## Workflow

You are executing the planning workflow. Follow these steps in order:

### 1. Fetch the Ticket

Use `linear_get_issue` to fetch the ticket details from Linear.

### 2. Check Readiness

Per SOP-01, verify the ticket has all required fields:
- Title
- Description with acceptance criteria
- Team
- Priority

### 3. Clarify if Needed

If any required information is missing or ambiguous, follow SOP-04:
- State what you understand
- List specific questions with options
- Ask all questions at once
- **Stop and wait for answers before proceeding**

### 4. Create Tech Plan Ticket

Per SOP-02, create a child ticket for the tech plan:
- Title: `<PARENT-ID>: Tech Plan — <description>`
- Link it to the parent ticket

### 5. Transition Parent Ticket

Use `linear_update_issue` to move the parent ticket to **In Progress**.

### 6. Explore the Codebase

Read code in the relevant repo to understand:
- Existing patterns and conventions
- Files that will need changes
- Dependencies and constraints

### 7. Write the Tech Plan

Create `plans/<ticket-id>-<short-desc>.md` in the target repo following the SOP-03 template:
- Context (link to ticket, what and why)
- Approach (files to change, decisions, trade-offs)
- Implementation Steps (ordered, commit-sized)
- Testing Strategy
- Risks & Open Questions

### 8. Create Branch and PR

- Create a branch per SOP-06: `<ticket-id>/<short-description>`
- Commit the tech plan file: `<TICKET-ID>: add tech plan`
- Create a PR per SOP-07 with the tech plan for review

### 9. Link and Report

- Link the tech plan PR to the tech plan ticket
- Report back with:
  - PR URL
  - Note that **implementation is blocked on tech plan approval**
