# GitHub Setup

Give a Kitchen agent a GitHub identity using a **machine user account**.

## Why a machine user?

Custom GitHub Apps cannot be @mentioned — only GitHub-maintained apps (like Copilot) have that ability. To give an agent a mentionable identity on GitHub, create a dedicated GitHub user account (a "machine user") for each agent. The agent authenticates with that account's PAT and appears as that user in PRs, comments, reviews, and @mentions.

## Prerequisites

- Kitchen running (`docker compose up`)
- A GitHub machine user account for the agent (e.g. `agent-bot`)
- The machine user added as a collaborator to target repositories

## 1. Create a machine user account

1. Sign up for a new GitHub account with a bot-style username (e.g. `agent-bot`)
2. Add the machine user as a collaborator (or org member) on repositories the agent needs access to
3. Accept the invitation from the machine user's account

## 2. Create a Personal Access Token

From the **machine user's** GitHub account:

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **Generate new token** → **Fine-grained token** (recommended)
3. Set a descriptive name (e.g. "Kitchen — Agent")
4. Select the repositories the agent should access
5. Under **Permissions → Repository permissions**, grant:
   - **Pull requests**: Read and write
   - **Issues**: Read and write (needed for PR comments)
   - **Contents**: Read (needed for reading file contents)
   - **Actions**: Read (needed for CI/CD workflow status)
6. Click **Generate token** and copy the `github_pat_` token

## 3. Configure Kitchen

Add the `github` block to your agent in `.kitchen.yaml`:

```yaml
agents:
  team:
    agent:
      displayName: "Agent"
      pluginPaths:
        - shared
      github:
        tokenEnv: AGENT_GITHUB_TOKEN
```

Add the token to your `.env`:

```
AGENT_GITHUB_TOKEN=github_pat_...
```

Replace `AGENT` with your agent's name in uppercase (matching the key in `.kitchen.yaml`).

## 4. Verify

1. Start Kitchen: `docker compose up`
2. Invoke the agent and ask it to list PRs on a repo it has access to
3. Confirm the agent creates PRs and comments as the machine user (e.g. `agent-bot`)

## Alternative: GitHub App Auth

Instead of a machine user PAT, you can authenticate using a **GitHub App installation token**. This is useful for organizations that prefer app-based access control over personal tokens.

### 1. Create a GitHub App

1. Go to your org's **Settings → Developer settings → GitHub Apps → New GitHub App**
2. Set the required permissions:
   - **Pull requests**: Read & write
   - **Issues**: Read & write
   - **Contents**: Read
   - **Actions**: Read (must be explicitly enabled — without this, `list-workflow-runs` returns "Resource not accessible by integration")
3. Install the app on the target repositories
4. **Important**: After changing permissions on an existing app, you must update the installation — go to the app's **Install App** page and click **Configure** next to the org/account, then approve the new permissions
5. Note the **App ID**, **Installation ID**, and generate a **private key**

### 2. Configure Kitchen

Add the credentials to your `.env`:

```
AGENT_GITHUB_APP_ID=123456
AGENT_GITHUB_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\n...
AGENT_GITHUB_INSTALLATION_ID=12345678
```

No changes to `.kitchen.yaml` are needed — Kitchen auto-detects app credentials by the `{PREFIX}_GITHUB_APP_ID` convention. If both a PAT and app credentials are set, app auth takes precedence.

## @Mentioning the agent

Because the agent operates as a regular GitHub user, you can @mention it natively (e.g. `@agent-bot please review this PR`).

## Available Tools

Run `kitchen-github --help` to see all available commands.

## Troubleshooting

- **"GITHUB_TOKEN not set"**: Check that `tokenEnv` in `.kitchen.yaml` matches the variable name in `.env`
- **401 Unauthorized**: Token may be expired or revoked — regenerate from the machine user's account
- **403 Forbidden**: Token lacks required permissions — check repository access and PR scopes
- **Agent actions appear under wrong user**: Ensure the PAT belongs to the machine user, not your personal account
- **"Resource not accessible by integration"**: The GitHub App or PAT lacks the required permission. For `list-workflow-runs`, grant **Actions: Read**. For GitHub Apps, approve updated permissions on the installation
- **No GitHub config without errors**: If the env var is missing, Kitchen skips GitHub for that agent — check your `.env` file
