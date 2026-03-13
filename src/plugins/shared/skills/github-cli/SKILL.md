---
name: github-cli
description: GitHub CLI tool usage. Use when performing GitHub operations like creating PRs, listing branches, or fetching file contents.
---

# kitchen-github

CLI binary for GitHub API operations. Invoke via Bash.

## Subcommands

| Subcommand | Key flags |
|---|---|
| `create-pull-request` | `--owner` `--repo` `--title` `--body` `--head` `--base` |
| `list-pull-requests` | `--owner` `--repo` `--state` (open/closed/all) |
| `get-pull-request` | `--owner` `--repo` `--pullNumber` |
| `add-pr-comment` | `--owner` `--repo` `--pullNumber` `--body` |
| `get-pr-diff` | `--owner` `--repo` `--pullNumber` |
| `list-pr-reviews` | `--owner` `--repo` `--pullNumber` |
| `get-pr-review-comments` | `--owner` `--repo` `--pullNumber` |
| `request-reviewers` | `--owner` `--repo` `--pullNumber` `--reviewers` (JSON array) |
| `get-file-contents` | `--owner` `--repo` `--path` `--ref` |
| `list-workflow-runs` | `--owner` `--repo` `--branch` `--status` |
| `list-branches` | `--owner` `--repo` |

## Examples

```bash
kitchen-github create-pull-request --owner Doma-Cooking --repo doma-main --title "KIT-42: add feature" --body "Description" --head feature-branch --base dev
kitchen-github get-pull-request --owner Doma-Cooking --repo kitchen --pullNumber 18
kitchen-github get-file-contents --owner Doma-Cooking --repo kitchen --path src/index.ts --ref dev
```

Use `kitchen-github <subcommand> --help` for full flag details.
