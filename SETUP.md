# Setup

## 1. Clone the repository

```bash
git clone <repo-url>
cd kitchen
```

## 2. Configure environment

Copy the example environment file and fill in your secrets:

```bash
cp .env.example .env
```

Edit `.env` with your values:

| Variable | Description |
|----------|-------------|
| `GITHUB_APP_ID` | GitHub App ID |
| `GITHUB_PRIVATE_KEY` | GitHub App private key (PEM format) |
| `GITHUB_WEBHOOK_SECRET` | Webhook signature verification secret |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |

## 3. Route GitHub webhooks to localhost

Use [smee](https://smee.io/) to forward GitHub webhooks to your local machine:

```bash
# Install smee client
npm install -g smee-client

# Create a channel at https://smee.io/new and start forwarding
smee -u https://smee.io/YOUR_CHANNEL_ID -t http://localhost:3000/webhooks/github
```

Configure your GitHub App webhook URL to point to your smee channel URL.

## 4. Start the service

**Development** (with hot reload):

```bash
./docker_dev.sh
```

**Production**:

```bash
./docker_prod.sh
```

The services will be available at:
- Kitchen Server: http://localhost:3000
- Dashboard: http://localhost:3001
