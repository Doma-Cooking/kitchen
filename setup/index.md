# Kitchen Setup

Get your first agent running from scratch.

## Prerequisites

- **Docker** and **Docker Compose** installed
- **Git** installed
- **Anthropic API key** — get one at [console.anthropic.com](https://console.anthropic.com)
- A **Slack workspace** where you can create apps (for the Slack integration)

---

## 1. Fork kitchen-starter

[kitchen-starter](https://github.com/Doma-Cooking/kitchen-starter) is the template for your plugin repo — it holds your agent definitions, domain knowledge, and tools.

1. Fork or copy [kitchen-starter](https://github.com/Doma-Cooking/kitchen-starter) to a new private repo in your org (e.g. `your-org/your-kitchen`)
2. Clone it locally and customise:
   - Edit `agents/agents/agent.md` — give your agent its identity and role
   - Rename the agent key (e.g. `agent` → `aria`) if you want a custom name
3. Push your changes to your repo

---

## 2. Clone Kitchen

```bash
git clone https://github.com/Doma-Cooking/kitchen.git
cd kitchen
```

---

## 3. Configure Kitchen

Run the setup script to scaffold your config files:

```bash
node scripts/setup.mjs
```

This copies `.kitchen.example.yaml` → `.kitchen.yaml` and `.env.example` → `.env` (skipping files that already exist), then validates your configuration.

Alternatively, copy them manually:

```bash
cp .kitchen.example.yaml .kitchen.yaml
cp .env.example .env
```

### .kitchen.yaml

Edit `.kitchen.yaml` to point at your plugin repo and configure your agent:

```yaml
plugins:
  path: /data/plugins/your-kitchen    # where Kitchen clones your plugin repo inside the container
  git:
    url: https://github.com/your-org/your-kitchen
    branch: main

company:
  name: Your Company
  description: a short description of what your company does

agents:
  defaultAgent: agent
  team:
    agent:
      displayName: "Agent"
      agentPrompt: agents/agents/agent.md
      pluginPaths:
        - shared
      slack:
        appTokenEnv: AGENT_SLACK_APP_TOKEN
        botTokenEnv: AGENT_SLACK_BOT_TOKEN
        userTokenEnv: AGENT_SLACK_USER_TOKEN
```

- The `plugins.git.url` must be accessible from inside the Docker container. For private repos, ensure the container has credentials (via `GITHUB_APP_ID` and related vars in `.env`, or by mounting SSH keys).
- `agentPrompt` is relative to `plugins.path`.
- `pluginPaths` lists subdirectories of `plugins.path` that are loaded as plugins for this agent.

### .env

Fill in your secrets:

```
ANTHROPIC_API_KEY=sk-ant-...

# Kitchen's own GitHub App credentials (used to authenticate git clone of your plugin repo)
GITHUB_APP_ID=...
GITHUB_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----
GITHUB_INSTALLATION_ID=...

# Per-agent Slack tokens — see setup/slack.md
AGENT_SLACK_APP_TOKEN=xapp-...
AGENT_SLACK_BOT_TOKEN=xoxb-...
AGENT_SLACK_USER_TOKEN=xoxp-...
```

See the integration guides for how to get each token:
- [Slack setup](./integrations/slack.md)
- [GitHub setup](./integrations/github.md)
- [Linear setup](./integrations/linear.md)

---

## 4. Start Kitchen

```bash
docker compose up
```

This starts three services:
- **app** — Kitchen agent runtime (port 3000)
- **redis** — BullMQ job queue
- **postgres** — session persistence

On first run, Kitchen clones your plugin repo into `plugins.path` inside the container.

Watch the logs for:
```
Slack bot started: agent
```

---

## 5. Verify your setup

Once the stack is running, validate your configuration:

```bash
node scripts/setup.mjs --validate-only
```

All five checks should pass. If Redis or Postgres show as unreachable, ensure `docker compose up` is running before re-running the script.

Then confirm the agent is responsive: @mention the bot in a Slack channel it's been invited to, or send it a DM. The bot should acknowledge (👀 reaction) and respond in-thread.

---

## Troubleshooting

- **Plugin repo fails to clone**: Check `GITHUB_APP_ID` / `GITHUB_INSTALLATION_ID` / `GITHUB_PRIVATE_KEY` in `.env` and verify the installation has access to your plugin repo
- **Agent doesn't appear in Slack**: Check that `AGENT_SLACK_APP_TOKEN` and `AGENT_SLACK_BOT_TOKEN` are set and Socket Mode is enabled on the app
- **"config file not found"**: Ensure `.kitchen.yaml` exists (not just the `.example` file)
- **Postgres connection errors**: On first run, wait a few seconds for Postgres to initialise before the app connects — Docker Compose's `depends_on` handles this but timing can vary
