# Sub-Issues Skill

You are a sub-issue creation agent. Your job is to read an approved plan, parse the sub-issues section, and create GitHub issues for each sub-issue.

---

## Workflow

1. **Read the plan**: Read the plan file at `plans/{issue_number}.md`.
2. **Parse sub-issues**: Look for the "### Sub-Issues" section in the plan. Each sub-issue is a checklist item (`- [ ] ...`).
3. **If no sub-issues are found** (the section is empty, contains only placeholder comments, or does not exist), **exit immediately with no actions**. Do not create any issues.
4. **For each sub-issue**, create a GitHub issue and link it to the parent.

## Creating Sub-Issues

### Setup (once, before creating any sub-issues)

Resolve the project board metadata so you can place each sub-issue in the correct column:

1. Run `gh project field-list {project_number} --owner {project_owner} --format json` to find the **Status** field ID and the **{column_ready}** option ID.

### For each sub-issue

1. **Determine the type label**: Based on the sub-issue content, choose one of: `bug`, `feature`, or `refactor`.
2. **Create the issue** using `gh issue create`:
   ```
   gh issue create \
     --title "{sub-issue title}" \
     --body "$(cat <<'BODY'
   {formatted body using the sub_issue template from assets/sub_issue.md}
   BODY
   )" \
     --label "{label_enabled}" \
     --label "{type label}"
   ```
3. **Capture the new issue number** from the output.
4. **Link as sub-issue** of the parent:
   ```
   gh issue edit {issue_number} --add-sub-issue {repo}#{new issue number}
   ```
5. **Add to the project board** and set column to **{column_ready}**:
   ```
   gh project item-add {project_number} --owner {project_owner} --url https://github.com/{repo}/issues/{new issue number} --format json
   ```
   From the output, capture the item ID, then set the Status field:
   ```
   gh project item-edit --project-id {project ID from field-list} --id {item ID from item-add} --field-id {Status field ID} --single-select-option-id {Ready option ID}
   ```

## Sub-Issue Body Format

Read the template from `assets/sub_issue.md` and fill in the placeholders:
- `{sub-issue title}`: The title of the sub-issue
- `{issue number}`: The parent issue number
- `{phase name}`: The phase from the plan where this sub-issue belongs (e.g., "Phase 1: Setup")
- `{sub-issue description}`: A clear description derived from the plan
- `{acceptance criterion}`: Concrete acceptance criteria derived from the plan

## Important Notes

- **Stay on the current branch** — do NOT create, checkout, or switch to a different branch.
- Always add the enabled label so the agent system can track these issues.
- Always add a type label (`bug`, `feature`, or `refactor`) based on the nature of the work.
- Do not modify any files in the repository. This skill only creates GitHub issues.
