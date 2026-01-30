// Auto-generated — do not edit. Source: src/implementation/template/*.md
export const templates: Record<string, string> = {
    "commit": `#{issue-number}: {brief description of changes, do NOT include Claude Code attribution}`,
    "one_pager_plan": `# One Pager: {issue title}

**Issue:** #{issue number}
**Repo:** {repository full name}
**Type:** One Pager (moderate scope, 4-10 files)

## Summary

<!-- One paragraph describing the feature or change -->

## Background

<!-- Context: why this change is needed, what problem it solves -->

## Technical Approach

<!-- High-level description of the implementation strategy -->

## Implementation Steps

1. <!-- Step-by-step plan -->

## Files

| File | Action | Description |
|------|--------|-------------|
| | | |

## Testing Strategy

- [ ] <!-- Unit tests -->
- [ ] <!-- Integration tests -->
- [ ] <!-- Manual verification steps -->

## Rollback Plan

<!-- How to revert if something goes wrong -->

## Open Questions

- <!-- Any unresolved questions (or "None") -->`,
    "plan_pr_body": `## Plan for #{issue number}

**Plan type:** {plan type: Quick Win, One Pager, or Tech Plan}

This PR contains the implementation plan for #{issue number}.

### Plan file
See the \`plans/\` directory for the full plan.

### Review instructions
1. Review the plan for completeness and correctness
2. Check that the scope assessment matches the issue complexity
3. Approve or request changes via PR review
4. Once approved, move the issue to "Ready"`,
    "pr_title": `Plan: {issue title} (#{issue number})`,
    "questions": `## Questions for #{issue number}: {issue title}

I need clarification on the following before proceeding:

<!-- Numbered list of questions, each with options and a recommendation -->

1. **<!-- Question -->**
   - Option A: <!-- description -->
   - Option B: <!-- description -->
   - **Recommendation:** <!-- which option and why -->`,
    "quick_win_plan": `# Quick Win Plan: {issue title}

**Issue:** #{issue number}
**Repo:** {repository full name}
**Type:** Quick Win (1-3 files, well-scoped change)

## Summary

<!-- One paragraph describing what this change does and why -->

## Change Description

<!-- Detailed description of the change being made -->

## Files to Modify

| File | Change |
|------|--------|
| | |

## Testing

- [ ] <!-- How to verify this change works -->

## Risks

- <!-- Any risks or edge cases to be aware of (or "None identified") -->`,
    "sub_issue": `## {sub-issue title}

**Parent issue:** #{issue number}
**Phase:** {phase name}

### Description

{sub-issue description}

### Acceptance Criteria

- [ ] {acceptance criterion}`,
    "tech_plan": `# Tech Plan: {issue title}

**Issue:** #{issue number}
**Repo:** {repository full name}
**Type:** Tech Plan (large scope, 10+ files, architecture change)

## Summary

<!-- One paragraph executive summary -->

## Background & Motivation

<!-- Why this change is needed, business context, user impact -->

## Goals & Non-Goals

### Goals
- <!-- What this plan aims to achieve -->

### Non-Goals
- <!-- What is explicitly out of scope -->

## Current Architecture

<!-- Description of the current state relevant to this change -->

## Proposed Architecture

<!-- Description of the target state after implementation -->

## Detailed Design

### Components

<!-- New or modified components and their responsibilities -->

### Data Model

<!-- Any data model changes -->

### APIs

<!-- Any API changes (internal or external) -->

### Migration

<!-- Migration strategy if applicable, or "N/A" -->

## Implementation Plan

### Phase 1: <!-- Phase name -->
- <!-- Tasks in this phase -->

### Phase 2: <!-- Phase name -->
- <!-- Tasks in this phase -->

### Sub-Issues
- [ ] <!-- Sub-issue for trackable units of work -->

## Testing Strategy

- [ ] <!-- Unit tests -->
- [ ] <!-- Integration tests -->
- [ ] <!-- End-to-end tests -->
- [ ] <!-- Performance tests if applicable -->

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| | | | |

## Alternatives Considered

<!-- Other approaches evaluated and why they were not chosen -->`
};
