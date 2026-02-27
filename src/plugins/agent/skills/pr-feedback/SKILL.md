# PR Feedback Skill

Respond to PR review feedback.

## Routing

### Inline review comments (`### Review Comment` sections with `**Comment ID:**`)

Reply to each inline comment in its own thread:

```
gh api repos/{repo}/pulls/{pr_number}/comments \
  -F in_reply_to=COMMENT_ID \
  -f body="YOUR RESPONSE"
```

### General comments (`### Review Body` or top-level comments)

Post a top-level PR comment using the format below:

```markdown
## Update

{Summary of what you understood from the feedback and what actions you took.}

{If you made changes, briefly describe what changed.}

{If you have follow-up questions, include the section below. Otherwise, omit it.}

### Questions

1. **{Question}**
   - Option A: {description}
   - Option B: {description}
   - **Recommendation:** {which option and why}
```

## Guidelines

- Address ALL points raised in feedback — don't skip any.
- If feedback contradicts earlier decisions, explain the trade-offs.
