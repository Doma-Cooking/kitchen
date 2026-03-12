---
name: linear-cli
description: Linear project management tools. Use when managing issues, projects, teams, or agent sessions in Linear.
---

# kitchen-linear

CLI binary for Linear API operations. Invoke via Bash.

## Subcommands

| Subcommand | Key flags |
|---|---|
| `create-issue` | `--title` `--teamId` `--description` `--priority` `--assigneeId` `--labelIds` (JSON array) |
| `update-issue` | `--issueId` `--title` `--description` `--stateId` `--priority` |
| `add-comment` | `--issueId` `--body` |
| `list-issues` | `--teamId` `--filter` |
| `get-issue` | `--issueId` (e.g. "KIT-5") |
| `search-issues` | `--teamId` `--stateId` `--assigneeId` `--labelId` `--priority` `--query` |
| `list-teams` | _(no flags)_ |
| `list-states` | `--teamId` |
| `list-members` | `--teamId` |
| `list-labels` | `--teamId` |
| `list-project-statuses` | _(no flags)_ |
| `get-templates` | `--teamId` |
| `create-project` | `--name` `--teamIds` (JSON array) `--description` `--statusId` `--targetDate` |
| `update-project` | `--projectId` `--name` `--description` `--statusId` `--targetDate` |
| `get-project` | `--projectId` |
| `list-projects` | `--teamId` |
| `list-project-issues` | `--projectId` |
| `add-issue-to-project` | `--issueId` `--projectId` |
| `emit-activity` | `--agentSessionId` `--type` `--body` `--action` `--parameter` `--result` |
| `update-session` | `--agentSessionId` `--plan` (JSON array) `--externalUrls` (JSON array) |

## Examples

```bash
kitchen-linear get-issue --issueId KIT-5
kitchen-linear list-issues --teamId b35c8789-74ea-4756-b13a-cbab36cfcace
kitchen-linear update-issue --issueId KIT-5 --stateId <in-review-state-id>
kitchen-linear emit-activity --agentSessionId <id> --type thought --body "Analyzing the codebase"
kitchen-linear update-session --agentSessionId <id> --plan '[{"content":"Step 1","status":"completed"},{"content":"Step 2","status":"inProgress"}]'
```

Use `kitchen-linear <subcommand> --help` for full flag details.
