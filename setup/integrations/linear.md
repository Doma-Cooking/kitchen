# Linear Setup

Give a Kitchen agent its own identity in Linear — it can be @mentioned in issues, receive delegated work, and respond via agent activities.

## Prerequisites

- Kitchen running (`docker compose up`)
- A Linear workspace with admin access (required for app installation)

## 1. Create a Linear Application

1. Go to [linear.app/settings/api](https://linear.app/settings/api) → **Applications**
2. Click **Create Application**
3. Set a name and icon for the agent (this is how it appears in @mention menus)
4. Set a **Callback URL** — this is only used during the one-time installation step below (any valid URL you control, e.g. `https://localhost/callback`)
5. Enable **Client credentials tokens** (required for Kitchen's server-to-server auth)
6. Under **Webhooks**, enable **Agent session events** and set the webhook URL to your Kitchen instance (e.g. `https://your-kitchen-host/linear/webhook`)
7. Note the **Client ID** and **Client Secret**

## 2. Install the App to Your Workspace

A workspace admin must authorize the app once using the OAuth flow with `actor=app`. Open the following URL in a browser (replace placeholders):

```
https://linear.app/oauth/authorize?client_id=<CLIENT_ID>&redirect_uri=<CALLBACK_URL>&response_type=code&scope=app:mentionable,app:assignable,read,write&actor=app
```

Authorize when prompted. This installs the app into the workspace — you do **not** need to exchange the authorization code for a token. Kitchen authenticates using the client credentials grant, which handles token management automatically.

## 3. Configure Kitchen

Add the Linear app's **Client ID** and **Client Secret** to your `.env`:

```
AGENT_LINEAR_CLIENT_ID=<your-client-id>
AGENT_LINEAR_CLIENT_SECRET=<your-client-secret>
```

Replace `AGENT` with your agent's name in uppercase (matching the key in `.kitchen.yaml`). The naming convention `{AGENT_ID}_LINEAR_CLIENT_ID` / `{AGENT_ID}_LINEAR_CLIENT_SECRET` is detected automatically. To override:

```yaml
agents:
  team:
    agent:
      displayName: "Agent"
      pluginPaths:
        - shared
      linear:
        clientIdEnv: CUSTOM_LINEAR_CLIENT_ID
        clientSecretEnv: CUSTOM_LINEAR_CLIENT_SECRET
```

## 4. Verify

1. Start Kitchen: `docker compose up`
2. In Linear, @mention the agent in an issue comment or delegate an issue to it
3. The agent should acknowledge within 10 seconds and respond via agent activities

## Available Tools

Run `kitchen-linear --help` to see all available commands.

## How It Works

When someone @mentions or delegates to the agent in Linear:

1. Linear creates an **AgentSession** and sends an `AgentSessionEvent` webhook to Kitchen
2. Kitchen enqueues the event with the session context (issue, comments, prompt)
3. The agent processes the request and uses `kitchen-linear emit-activity` to respond
4. Session state is visible to users in Linear's UI throughout

## Troubleshooting

- **Agent doesn't appear in @mention menu**: Check that the app was installed with `app:mentionable` scope and `actor=app`
- **"LINEAR_CLIENT_ID and LINEAR_CLIENT_SECRET must be set"**: Check that your `.env` has `{AGENT_ID}_LINEAR_CLIENT_ID` and `{AGENT_ID}_LINEAR_CLIENT_SECRET`
- **401 Unauthorized**: Kitchen automatically re-fetches the token on 401 — if this persists, verify your client secret hasn't been rotated in Linear
- **No response within 10 seconds**: Linear marks the agent as unresponsive — ensure the webhook URL is reachable and Kitchen is processing events
- **No Linear config without errors**: If the env var is missing, Kitchen skips Linear for that agent — check your `.env` file
