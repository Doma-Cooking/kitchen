# Slack Setup

Connect a Kitchen agent to Slack so it can receive messages and respond in threads.

## Prerequisites

- Kitchen running (`docker compose up`)
- A Slack workspace where you can create apps

## 1. Create a Slack App

### Quick Setup (Manifest)

The fastest way — a manifest pre-configures Socket Mode, scopes, and events in one step.

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App** → **From a manifest**
3. Select your workspace, then paste this manifest (replace `Agent` with your agent's display name):

```yaml
display_information:
  name: Agent
features:
  bot_user:
    display_name: Agent
    always_online: true
oauth_config:
  scopes:
    bot:
      - app_mentions:read
      - channels:history
      - channels:manage
      - channels:read
      - chat:write
      - files:write
      - groups:history
      - groups:read
      - groups:write.topic
      - im:history
      - mpim:history
      - reactions:write
      - users:read
    user:
      - search:read
settings:
  event_subscriptions:
    bot_events:
      - app_mention
      - message.im
  interactivity:
    is_enabled: false
  org_deploy_enabled: false
  socket_mode_enabled: true
  token_rotation_enabled: false
```

4. Click **Create**
5. Under **Socket Mode**, create an app-level token with `connections:write` — copy the `xapp-` token
6. Go to **OAuth & Permissions** → **Install to Workspace** — copy the `xoxb-` Bot Token
7. Go to **OAuth & Permissions** → **User Token Scopes** → add `search:read` → reinstall → copy the `xoxp-` User Token

### Manual Setup

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**
2. Name it after your agent and select your workspace
3. Enable **Socket Mode** and create an app-level token with `connections:write` (copy the `xapp-` token)
4. Go to **OAuth & Permissions** → **Bot Token Scopes** and add:
   - `chat:write` — send messages
   - `app_mentions:read` — receive @mentions
   - `channels:read` — read channel info
   - `channels:history` — read message history in public channels
   - `channels:manage` — set channel topics in public channels
   - `groups:read` — list private channels
   - `groups:history` — read message history in private channels
   - `groups:write.topic` — set channel topics in private channels
   - `im:history` — receive DMs
   - `mpim:history` — receive group DMs
   - `reactions:write` — add emoji reactions
   - `users:read` — look up user info
   - `files:write` — upload files
5. Go to **OAuth & Permissions** → **User Token Scopes** and add:
   - `search:read` — search messages across the workspace

   > **Why a user token?** The `search.messages` API requires a user token (`xoxp-*`) because search results are scoped to what the authenticating user can see. This scope cannot be added to bot tokens.
6. Click **Install to Workspace** — copy both the `xoxb-` Bot Token and the `xoxp-` User Token
7. Go to **Event Subscriptions** → enable events → subscribe to `message.im` and `app_mention`

## 2. Configure Kitchen

Add the `slack` block to your agent in `.kitchen.yaml`:

```yaml
agents:
  team:
    agent:
      displayName: "Agent"
      pluginPaths:
        - shared
      slack:
        appTokenEnv: AGENT_SLACK_APP_TOKEN
        botTokenEnv: AGENT_SLACK_BOT_TOKEN
        userTokenEnv: AGENT_SLACK_USER_TOKEN
```

Add the tokens to your `.env`:

```
AGENT_SLACK_APP_TOKEN=xapp-1-...
AGENT_SLACK_BOT_TOKEN=xoxb-...
AGENT_SLACK_USER_TOKEN=xoxp-...
```

Replace `AGENT` with your agent's name in uppercase (matching the key in `.kitchen.yaml`). Example: if your agent key is `aria`, use `ARIA_SLACK_APP_TOKEN`, etc.

## 3. Verify

1. Start Kitchen: `docker compose up`
2. Look for the log: `Slack bot started: agent`
3. In Slack, @mention the bot in a channel or send it a DM
4. The bot should respond in-thread

## Available Tools

Run `kitchen-slack --help` to see all available commands.

## Troubleshooting

- **Bot doesn't connect**: Check that both `xapp-` and `xoxb-` tokens are correct and Socket Mode is enabled
- **Bot connects but doesn't respond**: Verify event subscriptions (`message.im`, `app_mention`) are enabled
- **"not_in_channel" error**: Invite the bot to the channel first (`/invite @BotName`)
- **No Slack config without errors**: If env vars are missing, Kitchen skips Slack for that agent — check your `.env` file
- **"SLACK_USER_TOKEN not set" from search**: The `kitchen-slack search-messages` tool requires a user token (`xoxp-*`). Add `search:read` under **User Token Scopes**, reinstall the app, and set the user token in your `.env`
