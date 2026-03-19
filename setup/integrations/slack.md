# Slack Setup

Connect a Kitchen agent to Slack so it can receive messages and respond in threads.

## Prerequisites

- Kitchen running (`docker compose up`)
- A Slack workspace where you can create apps
- A public URL for Slack to send events to (see [Tunnel Setup](#tunnel-setup) below)

## 1. Create a Slack App

### Quick Setup (Manifest)

The fastest way — a manifest pre-configures scopes and events in one step.

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App** → **From a manifest**
3. Select your workspace, then paste this manifest (replace `Agent` with your agent's display name and `YOUR_TUNNEL_URL` with your tunnel URL):

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
      - files:read
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
    request_url: https://YOUR_TUNNEL_URL/slack/events/agent
    bot_events:
      - app_mention
      - message.im
  interactivity:
    is_enabled: false
  org_deploy_enabled: false
  socket_mode_enabled: false
  token_rotation_enabled: false
```

4. Click **Create**
5. Go to **Basic Information** → **App Credentials** — copy the **Signing Secret**
6. Go to **OAuth & Permissions** → **Install to Workspace** — copy the `xoxb-` Bot Token
7. Go to **OAuth & Permissions** → **User Token Scopes** → add `search:read` → reinstall → copy the `xoxp-` User Token

### Manual Setup

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**
2. Name it after your agent and select your workspace
3. Go to **OAuth & Permissions** → **Bot Token Scopes** and add:
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
   - `files:read` — read file metadata for attachments sent in messages
   - `files:write` — upload files
4. Go to **OAuth & Permissions** → **User Token Scopes** and add:
   - `search:read` — search messages across the workspace

   > **Why a user token?** The `search.messages` API requires a user token (`xoxp-*`) because search results are scoped to what the authenticating user can see. This scope cannot be added to bot tokens.
5. Click **Install to Workspace** — copy both the `xoxb-` Bot Token and the `xoxp-` User Token
6. Go to **Event Subscriptions** → enable events → set the **Request URL** to `https://YOUR_TUNNEL_URL/slack/events/<agentId>` → subscribe to `message.im` and `app_mention`
7. Go to **Basic Information** → **App Credentials** — copy the **Signing Secret**

## 2. Tunnel Setup

Kitchen uses HTTP mode for Slack events. Slack needs a public HTTPS URL to deliver webhooks. A `cloudflared` tunnel service is included in `docker-compose.yml` and starts automatically.

### Named Tunnel (recommended for persistent setups)

Use a Cloudflare tunnel with a custom domain for a stable URL that doesn't change between restarts.

1. Create a tunnel in the [Cloudflare Zero Trust dashboard](https://one.dash.cloudflare.com/) and point it at `http://app:3000`
2. Add the tunnel token to your `.env`:
   ```
   CLOUDFLARED_TUNNEL_TOKEN=eyJ...
   ```
3. Your Slack App event URL will be: `https://your-domain.com/slack/events/<agentId>`

### Ephemeral Tunnel (for quick local testing)

Omit `CLOUDFLARED_TUNNEL_TOKEN` from your `.env`. The tunnel service will create a temporary `trycloudflare.com` URL — no Cloudflare account needed.

1. Run `docker compose up`
2. Find the tunnel URL in the logs:
   ```
   docker compose logs tunnel
   ```
3. Set the tunnel URL as your Slack App's event subscription Request URL

> **Note:** Ephemeral URLs change on every restart. You'll need to update the Slack App event URL each time.

## 3. Configure Kitchen

Add the `slack` block to your agent in `.kitchen.yaml`:

```yaml
agents:
  team:
    agent:
      displayName: "Agent"
      pluginPaths:
        - shared
      slack:
        signingSecretEnv: AGENT_SLACK_SIGNING_SECRET
        botTokenEnv: AGENT_SLACK_BOT_TOKEN
        userTokenEnv: AGENT_SLACK_USER_TOKEN
```

Add the tokens to your `.env`:

```
AGENT_SLACK_SIGNING_SECRET=abc123...
AGENT_SLACK_BOT_TOKEN=xoxb-...
AGENT_SLACK_USER_TOKEN=xoxp-...
```

Replace `AGENT` with your agent's name in uppercase (matching the key in `.kitchen.yaml`). Example: if your agent key is `aria`, use `ARIA_SLACK_SIGNING_SECRET`, etc.

## 4. Verify

1. Start Kitchen: `docker compose up`
2. Check the tunnel is running: `docker compose logs tunnel`
3. In Slack, @mention the bot in a channel or send it a DM
4. The bot should respond in-thread

## Available Tools

Run `kitchen-slack --help` to see all available commands.

## Troubleshooting

- **403 from Slack events endpoint**: Check that the signing secret in `.env` matches the one in **Basic Information** → **App Credentials**
- **Bot doesn't respond**: Verify event subscriptions (`message.im`, `app_mention`) are enabled and the Request URL is correct
- **"not_in_channel" error**: Invite the bot to the channel first (`/invite @BotName`)
- **No Slack config without errors**: If env vars are missing, Kitchen skips Slack for that agent — check your `.env` file
- **"SLACK_USER_TOKEN not set" from search**: The `kitchen-slack search-messages` tool requires a user token (`xoxp-*`). Add `search:read` under **User Token Scopes**, reinstall the app, and set the user token in your `.env`
- **Tunnel URL changed**: If using ephemeral tunnels, update the event subscription URL in your Slack App settings after each restart
