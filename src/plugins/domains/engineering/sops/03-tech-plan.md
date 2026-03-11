# SOP-03: Tech Plan Standards

## Overview

A tech plan is created when executing a tech planning ticket. The tech planning ticket is a normal ticket (created per SOP-02 with the `tech-plan` label) whose work product is a tech plan document.

## Delivery

1. Create a markdown file at `plans/<ticket-id>-<short-desc>.md` in the target repo
2. Create a branch and PR the tech plan file for review
3. The tech plan PR follows SOP-07 (PR standards) like any other PR

## Templates

Two types of tech plans — choose based on scope:

- **One-pager** (`../templates/tech-plan-one-pager.md`) — work that can be delivered in a single PR
- **Full tech plan** (`../templates/tech-plan-full.md`) — larger work requiring multiple tickets, includes parallelization notes and dependencies

## After Approval

Once the tech plan PR is approved and merged:

- Create implementation ticket(s) for the work defined in the tech plan
- Link each implementation ticket to the tech plan ticket (tech plan ticket is the parent in Linear)
- Be proactive: create all tickets identified in the plan before starting implementation

## Approval

Wait for tech plan PR approval before creating implementation tickets or starting implementation.
