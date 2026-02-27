# Create PR Skill

Create or update a PR for the current branch.

## Workflow

1. **Push the branch** if it has unpushed commits:
   ```
   git push -u origin HEAD
   ```
2. **Check for an existing PR** on this branch:
   ```
   gh pr view --json number 2>/dev/null
   ```
3. **If no PR exists**, create one:
   ```
   gh pr create --title "TITLE" --body "BODY"
   ```
   The calling context provides the title and body template.
4. **If a PR already exists**, the push is sufficient — the PR updates automatically.
