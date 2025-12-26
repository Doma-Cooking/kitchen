# Deployment

Kitchen runs as a Docker Compose stack. Internal services (Redis, MinIO) are pre-configured. Users only need to provide external API credentials.

---

## Required Secrets

Provide these via Docker secrets or environment variables. The system checks `/run/secrets/{name}` first, then falls back to `process.env`.

| Secret | Description |
|--------|-------------|
| `GITHUB_APP_ID` | GitHub App ID |
| `GITHUB_PRIVATE_KEY` | GitHub App private key (PEM format) |
| `GITHUB_WEBHOOK_SECRET` | Webhook signature verification secret |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |

---

## Optional Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `DASHBOARD_PORT` | `3000` | Dashboard HTTP port |
| `SLACK_WEBHOOK_URL` | — | Slack incoming webhook (if notifications enabled) |

---

## Internal Services

The following services are managed internally by docker-compose and require no configuration:

- **Redis** — Job queue (BullMQ)
- **MinIO** — Session storage (S3-compatible)

Credentials for these services are generated at deployment time and not exposed to users.
