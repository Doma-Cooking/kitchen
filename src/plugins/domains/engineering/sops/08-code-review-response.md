# SOP-08: Code Review Response

## Process

### 1. Read Everything First

Before responding to any comment:
- Fetch the PR and all reviews (`github_get_pull_request`, `github_list_pr_reviews`)
- Read the current diff for context (`github_get_pr_diff`)
- Understand the full picture before acting

### 2. Categorize Each Comment

For every review comment, decide:

- **Agree & Fix** — the reviewer is right, make the change
- **Disagree** — explain your reasoning clearly and respectfully
- **Question** — ask for clarification if the comment is ambiguous

### 3. Address All in One Pass

Don't respond piecemeal. Batch all fixes and responses together:
- Implement all agreed fixes
- Write all responses
- Push once, reply once

### 4. Commit Format

```
<TICKET-ID>: address review feedback
```

Keep fix commits **separate** from the original implementation commits. Do not amend or squash into previous commits — reviewers need to see what changed.

### 5. After Addressing

- Reply to individual comments where needed
- Post a summary comment on the PR noting what was addressed
- Request re-review if substantive changes were made (`github_request_reviewers`)
