---
name: kitchen-cli
description: Kitchen internal tools. Use when triggering another agent or sending an event to the Kitchen agent orchestration system.
---

# kitchen-tools

CLI binary for Kitchen internal operations. Invoke via Bash.

## Subcommands

| Subcommand | Key flags |
|---|---|
| `create-agent-event` | `--agentId` `--message` `--stationId` `--data` (JSON object) `--delay` (seconds) |

## Examples

```bash
# Trigger another agent with a message
kitchen-tools create-agent-event --agentId toph --message "Please review PR #42"

# Resume an existing conversation (stationId)
kitchen-tools create-agent-event --agentId toph --stationId <session-id> --message "Follow-up: the tests are passing now"

# Trigger with a delay
kitchen-tools create-agent-event --agentId toph --message "Run daily report" --delay 3600

# Pass structured data
kitchen-tools create-agent-event --agentId toph --message "Process this" --data '{"issueId":"KIT-5","repo":"kitchen"}'
```

Use `kitchen-tools <subcommand> --help` for full flag details.
