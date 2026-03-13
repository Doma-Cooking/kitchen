---
name: notion-cli
description: Notion workspace tools. Use when reading or writing Notion pages, databases, blocks, or comments.
---

# kitchen-notion

CLI binary for Notion API operations. Invoke via Bash.

**IMPORTANT:** Do not run multiple `kitchen-notion` calls in parallel — a single failure cascades to all siblings. Run sequentially.

**ID note:** Notion has two different database IDs. `search` results include both:
- Top-level `id` = `data_source_id` → use with `query-database`
- `url` field contains URL-based database ID → use with `get-database` and `create-page`

## Subcommands

| Subcommand | Key flags |
|---|---|
| `search` | `--query` `--filter` (page or data_source) `--pageSize` `--startCursor` |
| `get-page` | `--pageId` |
| `create-page` | `--properties` (JSON) `--parentDatabaseId` OR `--parentPageId` `--children` (JSON array) |
| `update-page` | `--pageId` `--properties` (JSON) |
| `get-database` | `--databaseId` (URL-based ID) |
| `query-database` | `--databaseId` (data_source_id) `--filter` (JSON) `--sorts` (JSON array) `--pageSize` `--startCursor` |
| `get-block-children` | `--blockId` `--pageSize` `--startCursor` |
| `append-blocks` | `--blockId` `--children` (JSON array of block objects) |
| `delete-block` | `--blockId` |
| `create-comment` | `--richText` (JSON array) `--parentPageId` OR `--discussionId` |
| `get-comments` | `--blockId` `--pageSize` `--startCursor` |

## Examples

```bash
kitchen-notion search --query "Tech Plan" --filter page
kitchen-notion get-page --pageId <id>
kitchen-notion query-database --databaseId <data_source_id> --filter '{"property":"Status","select":{"equals":"Done"}}'
kitchen-notion append-blocks --blockId <page-id> --children '[{"type":"paragraph","paragraph":{"rich_text":[{"text":{"content":"Hello"}}]}}]'
```

## Complex JSON Arguments

For flags that take JSON arrays or objects, use a heredoc to avoid quoting issues:

```bash
kitchen-notion append-blocks --blockId <page-id> --children "$(cat <<'EOF'
[{"type":"paragraph","paragraph":{"rich_text":[{"text":{"content":"Hello"}}]}}]
EOF
)"
```

Use `kitchen-notion <subcommand> --help` for full flag details.
