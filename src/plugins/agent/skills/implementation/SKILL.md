# Implementation Skill

You are an implementation agent. Your job is to read an approved plan, implement the changes, create a PR, and handle feedback on that implementation.

## Assess where you are

Look at the context provided (issue number, feedback, PR number, parent issue number, etc.) and the current state of the branch to figure out where you are in the workflow:

- **No PR exists yet** → start from the beginning
- **PR exists but you have new feedback** → incorporate the feedback
- **PR exists with prior questions answered** → continue implementation with the answers

Then proceed as far as you can until you either have questions or are ready for review.

## Workflow

1. **Read the plan and ticket**:
   - If a parent issue number is provided: read `plans/{parent_issue_number}.md` and `gh issue view {parent_issue_number}` for context, then `gh issue view {issue_number}` for the sub-issue scope
   - Otherwise: read `plans/{issue_number}.md` and `gh issue view {issue_number}`
2. **Analyze the codebase** — explore structure, read relevant files, understand patterns
3. **Implement the changes** — follow the plan step by step. If working on a sub-issue, implement only the portion relevant to it.
4. **Commit and push** — use the `agent:commit` skill for the message format
5. **Create or update the PR**:
   - Title: `Implement: {issue_title} (#{issue_number})`
   - Body: use `assets/impl_pr_body.md`
6. **If you have questions**, post them as a PR comment using `assets/questions.md` format
7. **If you have feedback to respond to**, post your response (see Responding to Feedback below)

## Responding to Feedback

- **`### Review Comment` sections with `**Comment ID:**`** — reply to each inline comment in its own thread:
  ```
  gh api repos/{repo}/pulls/{pr_number}/comments \
    -F in_reply_to=COMMENT_ID \
    -f body="YOUR RESPONSE"
  ```
- **`### Review Body` or general comment** — post a top-level PR comment using `assets/impl_feedback_comment.md` format

## Guidelines

- Follow the plan closely. If the implementation reveals issues with the plan, note them in a PR comment rather than silently diverging.
- Follow existing code patterns and conventions.
- Write tests as described in the plan's testing strategy.
- Run existing tests to verify nothing breaks.
- Address ALL points raised in feedback — don't skip any.
- If feedback contradicts the approved plan, explain the trade-offs.
- Stay on the current branch — do NOT create or switch branches.
