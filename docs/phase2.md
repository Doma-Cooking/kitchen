# Phase 2: Slack Integration

## Context

Kitchen's agent runtime is built (HTTP API → BullMQ → Worker → Agent SDK → MCP tools). Phase 2 wires up Slack as a second input. Each agent gets its own Slack bot (@handle). The bot identity IS the routing — no channel mapping needed.

**Flow:** Slack (Socket Mode, per-agent bot) → SlackListener (presentation) → HandleEventUseCase → BullMQ → Worker → Agent SDK → `slack_send_message` MCP tool → Slack thread

## Design Decisions

### 1. Bolt SDK in the presentation layer

Bolt SDK is an input interface (like Hono routes), not a data source. It lives in `presentation/` as `SlackListener`, parallel to the HTTP routes.

### 2. Prompt enrichment from trigger

```
[Source: slack | channel: C0123 | thread_ts: 1234.5678 | user: U0123]

<original message>
```

The worker in `event.repository.ts` reads `event.trigger` to build this. `ClaudeSource` stays source-agnostic.

## Implementation Steps

### 1. Add `@slack/bolt` dependency

**`kitchen/package.json`** — add `"@slack/bolt": "latest"`.

### 2. Extend config with per-agent Slack tokens

**`kitchen/src/domain/entity/kitchen-config.ts`** — add optional `slack` to agent team config:
```ts
export interface SlackBotConfig {
  appToken: string
  botToken: string
}
```

**`kitchen/src/data/repository/config.repository.ts`** — yaml references env var names per agent:
```yaml
agents:
  team:
    toph:
      displayName: "Toph"
      pluginPaths: [shared, domains/operations, agents/toph]
      slack:
        appTokenEnv: TOPH_SLACK_APP_TOKEN
        botTokenEnv: TOPH_SLACK_BOT_TOKEN
```
Config repo resolves `appTokenEnv`/`botTokenEnv` → actual values from `process.env`. If either missing, `slack` stays `undefined` for that agent.

**`kitchen/src/data/repository/agent.repository.ts`** — include resolved `slack?: SlackBotConfig` in `AgentConfig`.

**`kitchen/src/domain/entity/agent-config.ts`** — add optional `slack` field.

### 3. Create `SlackListener` in presentation layer

**New: `kitchen/src/presentation/slack-listener.ts`**

- Manages multiple Bolt `App` instances — one per agent with `slack` config
- Constructor takes: list of `{ agentId, slack: SlackBotConfig }` + `HandleEventUseCase`
- Each app listens on `message` and `app_mention`
- Creates `AgentEvent` with `SlackTrigger` and calls `handleEventUseCase.execute()`
- Thread: `thread_ts ?? ts` (always thread)
- Skip `subtype !== undefined` (ignore bot/edited messages)
- `start()` / `stop()` for lifecycle

### 4. Enrich worker prompt from trigger + pass botToken to MCP

**`kitchen/src/data/repository/event.repository.ts`** — two changes:

1. Add `buildPrompt(event)`: if `trigger.type === 'slack'`, prepend `[Source: slack | channel | thread_ts | user]` context line. API triggers return `event.message` unchanged.

2. Look up the agent's `botToken` from `AgentConfig.slack` and pass it as env to `claudeSource.invokeAgent()`. The token flows directly to the MCP server process — the agent never sees it.

**`kitchen/src/data/source/claude.source.ts`** — extend `invokeAgent()` to accept optional `env: Record<string, string>`. Set these on `process.env` before calling `query()` so MCP server child processes (spawned by the Agent SDK) inherit them.

### 5. Wire into DI + bootstrap

**`kitchen/src/dependencies.ts`** — collect agents with slack config, create `SlackListener` if any exist.

**`kitchen/src/index.ts`** — `await slackListener?.start()` after server starts. Add `slackListener?.stop()` to shutdown.

### 6. Update config examples

> **Setup guide:** See [docs/kitchen/setup/slack-agent.md](../setup/slack-agent.md) for step-by-step Slack app creation and configuration.

**`kitchen/.kitchen.example.yaml`** — per-agent slack block (see step 2).

**`kitchen/.env.example`** — add:
```
TOPH_SLACK_APP_TOKEN=xapp-...
TOPH_SLACK_BOT_TOKEN=xoxb-...
```

### 7. Replace `slack_send_message` stub with real MCP server

**New: `tech-marketplace/plugins/shared/tools/slack-send-message.ts`** — MCP server using `@modelcontextprotocol/sdk`:
- Tool: `slack_send_message({ channel, thread_ts, text })`
- Uses `@slack/web-api` `WebClient` with `SLACK_BOT_TOKEN` from env
- The worker sets `SLACK_BOT_TOKEN` on `process.env` before invoking the agent — the MCP server process inherits it. The agent itself never sees the token.

**`tech-marketplace/plugins/shared/.mcp.json`** — point to real server:
```json
"slack": {
  "command": "npx",
  "args": ["tsx", "${CLAUDE_PLUGIN_ROOT}/tools/slack-send-message.ts"],
  "env": { "SLACK_BOT_TOKEN": "${SLACK_BOT_TOKEN}" }
}
```

## Files Summary

| Action | File |
|--------|------|
| Modify | `domain/entity/agent-config.ts` — add optional `slack` field |
| Modify | `domain/entity/kitchen-config.ts` — add `SlackBotConfig` |
| Modify | `data/repository/config.repository.ts` — resolve per-agent slack tokens |
| Modify | `data/repository/agent.repository.ts` — include slack in `AgentConfig` |
| Modify | `data/repository/event.repository.ts` — `buildPrompt()` + pass agent's botToken as MCP env |
| Modify | `data/source/claude.source.ts` — accept optional env map, set on `process.env` for MCP inheritance |
| Create | `presentation/slack-listener.ts` — multi-bot Bolt SDK listener |
| Modify | `dependencies.ts` — create SlackListener |
| Modify | `index.ts` — start/stop SlackListener |
| Modify | `package.json` — add `@slack/bolt` |
| Modify | `.kitchen.example.yaml` — per-agent slack config |
| Modify | `.env.example` — per-agent token vars |
| Create | `plugins/shared/tools/slack-send-message.ts` — real MCP server |
| Modify | `plugins/shared/.mcp.json` — point to real server |

## Verification

1. Without slack config: `docker compose up` works, no errors
2. With slack on Toph: bot connects, logs "Slack bot started: Toph"
3. @mention Toph → job enqueued → worker builds prompt with Slack context → agent responds in-thread as Toph's bot
4. Bot's own messages ignored
5. Multiple bots work independently
6. `POST /agent/:id/invoke` still works (trigger: api, no regression)
7. Graceful shutdown disconnects all bots before closing workers
