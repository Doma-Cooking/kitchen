---
name: review-response
description: Respond to code review feedback on a PR. Use when asked to address review comments or fix review feedback.
---

# Review Response Skill

## Workflow

You are executing the review response workflow. Follow these steps in order:

### 1. Fetch PR and Reviews

- Use `github_get_pull_request` to get the PR details
- Use `github_list_pr_reviews` to get review summaries
- Use `github_get_pr_review_comments` to get inline review comments
- Use `github_get_pr_diff` to understand the current diff

Read everything before taking action.

### 2. Categorize Comments

For each review comment, decide:
- **Agree & Fix** — make the requested change
- **Disagree** — prepare a clear, respectful explanation
- **Question** — prepare a clarifying question

### 3. Implement Fixes

Address all agreed fixes in one pass — don't respond piecemeal. Batch all changes together, push once, reply once.

- Keep fix commits **separate** from original implementation commits. Do not amend or squash into previous commits — reviewers need to see what changed.
- Commit format: `<TICKET-ID>: address review feedback`

### 4. Verify

- Run linters/type checkers — zero errors required

### 5. Respond

- Reply to individual comments where needed (`github_add_pr_comment`)
- Post a summary comment on the PR noting what was addressed and any points of disagreement

### 6. Request Re-review

If substantive changes were made, use `github_request_reviewers` to request re-review from the original reviewers.
