# PR Questions Skill

Post questions as a PR comment using `gh pr comment`.

## Format

```markdown
## Questions for #{issue_number}: {issue_title}

I need clarification on the following before proceeding:

1. **{Question}**
   - Option A: {description}
   - Option B: {description}
   - **Recommendation:** {which option and why}
```

## Usage

Post the comment on the current PR:

```
gh pr comment {pr_number} --body "YOUR QUESTIONS"
```

Number each question. For each, list concrete options with a recommendation.
