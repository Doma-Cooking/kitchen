---
name: slack-cli
description: Slack messaging tools. Use when sending messages, reading channel history, uploading files, or managing reactions.
---

# kitchen-slack

CLI binary for Slack API operations. Invoke via Bash.

## Subcommands

| Subcommand | Key flags |
|---|---|
| `send-message` | `--channel` `--text` `--threadTs` (optional, to reply in thread) |
| `add-reaction` | `--channel` `--timestamp` `--name` (emoji without colons) |
| `get-thread-replies` | `--channel` `--threadTs` `--limit` |
| `get-channel-history` | `--channel` `--limit` `--oldest` `--latest` |
| `get-message` | `--channel` `--ts` |
| `search-messages` | `--query` `--count` `--sort` (requires user token) |
| `get-user-info` | `--user` (Slack user ID) |
| `list-channels` | `--types` `--limit` `--excludeArchived` |
| `update-message` | `--channel` `--ts` `--text` |
| `upload-file` | `--channelId` `--content` `--filename` `--title` `--initialComment` `--threadTs` |
| `search-users` | `--query` (matches name, display name, email) |
| `set-channel-topic` | `--channel` `--topic` |

## Examples

```bash
kitchen-slack send-message --channel C01234 --text "Hello!"
kitchen-slack send-message --channel C01234 --threadTs 1234567890.123456 --text "Reply in thread"
kitchen-slack get-channel-history --channel C01234 --limit 10
kitchen-slack search-users --query "alice"
```

Use `kitchen-slack <subcommand> --help` for full flag details.
