---
name: review-response
description: Respond to code review feedback on a PR. Use when asked to address review comments or fix review feedback.
---

# Review Response Skill

## Workflow

You are executing the review response workflow. Follow these steps in order:

### 1. Fetch PR and Reviews

- Use `kitchen-github get-pull-request` to get the PR details
- Use `kitchen-github list-pr-reviews` to get review summaries
- Use `kitchen-github get-pr-review-comments` to get inline review comments
- Use `kitchen-github get-pr-diff` to understand the current diff

Read everything before taking action.

### 2. Categorize Comments

For each review comment, decide:
- **Agree & Fix** — make the requested change
- **Disagree** — prepare a clear, respectful explanation
- **Question** — prepare a clarifying question

### 3. Implement Fixes

Address all agreed fixes in one pass — don't respond piecemeal. Batch all changes together, push once, reply once.

- Keep fix commits **separate** from original implementation commits. Do not amend or squash into previous commits — reviewers need to see what changed.
- Commit format: `<TICKET-ID>: <brief description of changes>`

### 4. Verify

- Run linters/type checkers — zero errors required

### 5. Respond

- Reply to the individual comments that were addressed with a concise update using (`kitchen-github add-pr-comment`).
- Post a summary comment on the PR noting what was addressed and any points of disagreement.
- Post an update in the communication channel where the review response was requested (ie: Slack, Linear).

### 6. Request Re-review

If substantive changes were made, use `kitchen-github request-reviewers` to request re-review from the original reviewers.
