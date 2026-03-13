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

Use `kitchen-linear get-issue` to fetch the ticket details from Linear.

### 2. Clarify if Needed

If any required information is missing or ambiguous, follow SOP-04:
- State what you understand
- List specific questions with options
- Ask all questions at once
- **Stop and wait for answers before proceeding**

### 3. Transition Ticket to In Progress

Use `kitchen-linear update-issue` to move the tech plan ticket to **In Progress**.

### 4. Explore the Codebase

Read code in the relevant repo to understand:
- Existing patterns and conventions
- Files that will need changes
- Dependencies and constraints

### 5. Write the Tech Plan

Create `plans/<ticket-id>-<short-desc>.md` in the target repo following the SOP-03 template.

### 6. Create Branch and PR

- Create a branch per SOP-06: `<ticket-id>/<short-description>`
- Commit the tech plan file: `<TICKET-ID>: add tech plan`
- NEVER include Claude commit attributions
- Create a PR per SOP-07 with the tech plan for review

### 7. Link and Report

- Link the tech plan PR to the ticket
- Report back with the PR URL, noting that **implementation is blocked on tech plan approval**
