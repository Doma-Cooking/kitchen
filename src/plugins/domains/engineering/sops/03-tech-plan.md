# SOP-03: Tech Plan Standards

## When Required

Create a tech plan for:
- Non-trivial changes (multi-file, architectural impact)
- Ambiguous approach with multiple viable options
- Work that benefits from upfront design review

Skip for small, well-defined changes (typo fixes, config updates, single-file bug fixes).

## Delivery

1. Create a markdown file at `plans/<ticket-id>-<short-desc>.md` in the target repo
2. Create a branch and PR the tech plan file for review
3. The tech plan PR follows SOP-07 (PR standards) like any other PR

## Ticket

Each tech plan gets its own Linear ticket:
- Created as a child of the parent work ticket
- Titled: `<PARENT-ID>: Tech Plan — <description>`
- Created per SOP-02 standards

## Template

```markdown
# Tech Plan: <title>

## Context

**Ticket:** <link to Linear ticket>

<What this work is and why it's needed. 2-3 sentences.>

## Approach

<High-level strategy. Which files/modules change and why.>

### Key Decisions

<Trade-offs considered. Why this approach over alternatives.>

## Implementation Steps

<Ordered list. Each step should be roughly one commit.>

1. ...
2. ...
3. ...

## Testing Strategy

<How to verify the implementation is correct.>

## Risks & Open Questions

<Anything unresolved. Risks to call out. Dependencies.>
```

## Approval

Wait for tech plan PR approval before proceeding to implementation.
