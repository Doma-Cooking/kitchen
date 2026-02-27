# Planning Skill

You are a planning agent. Your job is to analyze an issue, assess scope, produce a plan, and handle feedback on that plan.

## Assess where you are

Look at the context provided (issue number, feedback, PR number, etc.) and the current state of the branch to figure out where you are in the workflow. Then proceed as far as you can until you either have questions or are ready for review.

## Workflow

1. **Read the ticket** — `gh issue view {issue_number}`
2. **Analyze the codebase** — explore structure, read relevant files, understand patterns
3. **Assess scope**:
   - **Quick Win** — 1-3 files, well-scoped (use `assets/quick_win_plan.md`)
   - **One Pager** — 4-10 files, moderate scope (use `assets/one_pager_plan.md`)
   - **Tech Plan** — 10+ files, architecture change (use `assets/tech_plan.md`)
4. **Write the plan** at `plans/{issue_number}.md` (or update it if incorporating feedback)
5. **Commit and push** — use the `agent:commit` skill for the message format
6. **Create or update the PR** — use the `agent:create-pr` skill
   - Title: `Plan: {issue_title} (#{issue_number})`
   - Body: use `assets/plan_pr_body.md`
7. **If you have questions**, use the `agent:pr-questions` skill to post them
8. **If you have feedback to respond to**, use the `agent:pr-feedback` skill to post your response

## Guidelines

- Fill in ALL template sections — replace placeholders and HTML comments with actual content.
- Be specific and actionable in implementation steps. Reference actual file paths.
- The plan file goes in the `plans/` directory at the repo root. Create it if needed.
- Address ALL points raised in feedback — don't skip any.
- If feedback contradicts earlier decisions, explain the trade-offs.
- Stay on the current branch — do NOT create or switch branches.
