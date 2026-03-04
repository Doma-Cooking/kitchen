# Slack Agent Setup

Connect a Kitchen agent to Slack so it can receive messages and respond in threads.

## Prerequisites

- Kitchen running (`docker compose up`)
- A Slack workspace where you can create apps

## 1. Create a Slack App

### Quick Setup (Manifest)

The fastest way — a manifest pre-configures Socket Mode, scopes, and events in one step.

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App** → **From a manifest**
3. Select your workspace, then paste the contents of [`slack-manifest.example.yaml`](./slack-manifest.example.yaml)
4. Update the `name` and `display_name` fields if your agent isn't named "Toph"
5. Click **Create**
6. Under **Socket Mode**, create an app-level token with `connections:write` — copy the `xapp-` token
7. Go to **OAuth & Permissions** → **Install to Workspace** — copy the `xoxb-` Bot Token

### Manual Setup

If you prefer to configure the app step-by-step:

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**
2. Name it after your agent (e.g. "Toph") and select your workspace
3. Enable **Socket Mode** and create an app-level token with `connections:write` (copy the `xapp-` token)
4. Go to **OAuth & Permissions** → **Bot Token Scopes** and add:
   - `chat:write` — send messages
   - `app_mentions:read` — receive @mentions
   - `channels:read` — read channel info
   - `channels:history` — read message history in public channels
   - `groups:history` — read message history in private channels
   - `im:history` — receive DMs
   - `mpim:history` — receive group DMs
   - `reactions:write` — add emoji reactions
5. Click **Install to Workspace** and copy the `xoxb-` Bot Token
6. Go to **Event Subscriptions** → enable events → subscribe to `message.im` and `app_mention`

## 2. Configure Kitchen

Add the `slack` block to your agent in `.kitchen.yaml`:

```yaml
agents:
  team:
    toph:
      displayName: "Toph"
      pluginPaths:
        - shared
        - domains/operations
      slack:
        appTokenEnv: TOPH_SLACK_APP_TOKEN
        botTokenEnv: TOPH_SLACK_BOT_TOKEN
```

Add the tokens to your `.env`:

```
TOPH_SLACK_APP_TOKEN=xapp-1-...
TOPH_SLACK_BOT_TOKEN=xoxb-...
```

## 3. Verify

1. Start Kitchen: `docker compose up`
2. Look for the log: `Slack bot started: toph`
3. In Slack, @mention the bot in a channel or send it a DM
4. The bot should respond in-thread

## Available Tools

- **`slack_send_message`** — send a message to a channel or thread
- **`slack_add_reaction`** — add an emoji reaction to a message (requires `reactions:write` scope)

## Troubleshooting

- **Bot doesn't connect**: Check that both `xapp-` and `xoxb-` tokens are correct and Socket Mode is enabled
- **Bot connects but doesn't respond**: Verify event subscriptions (`message.im`, `app_mention`) are enabled
- **"not_in_channel" error**: Invite the bot to the channel first (`/invite @BotName`)
- **No Slack config without errors**: If env vars are missing, Kitchen skips Slack for that agent — check your `.env` file
