# GitHub Agent Setup

Give a Kitchen agent a GitHub identity using a **machine user account**.

## Why a machine user?

Custom GitHub Apps cannot be @mentioned — only GitHub-maintained apps (like Copilot) have that ability. To give an agent a mentionable identity on GitHub, create a dedicated GitHub user account (a "machine user") for each agent. The agent authenticates with that account's PAT and appears as that user in PRs, comments, reviews, and @mentions.

## Prerequisites

- Kitchen running (`docker compose up`)
- A GitHub machine user account for the agent (e.g. `toph-bot`)
- The machine user added as a collaborator to target repositories

## 1. Create a machine user account

1. Sign up for a new GitHub account with a bot-style username (e.g. `toph-bot`)
2. Add the machine user as a collaborator (or org member) on repositories the agent needs access to
3. Accept the invitation from the machine user's account

## 2. Create a Personal Access Token

From the **machine user's** GitHub account:

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **Generate new token** → **Fine-grained token** (recommended)
3. Set a descriptive name (e.g. "Kitchen — Toph")
4. Select the repositories the agent should access
5. Under **Permissions → Repository permissions**, grant:
   - **Pull requests**: Read and write
   - **Issues**: Read and write (needed for PR comments)
6. Click **Generate token** and copy the `github_pat_` token

## 3. Configure Kitchen

Add the `github` block to your agent in `.kitchen.yaml`:

```yaml
agents:
  team:
    toph:
      displayName: "Toph"
      pluginPaths:
        - shared
        - domains/operations
      github:
        tokenEnv: TOPH_GITHUB_TOKEN
```

Add the token to your `.env`:

```
TOPH_GITHUB_TOKEN=github_pat_...
```

## 4. Verify

1. Start Kitchen: `docker compose up`
2. Invoke the agent and ask it to list PRs on a repo it has access to
3. Confirm the agent creates PRs and comments as the machine user (e.g. `toph-bot`)

## Alternative: GitHub App Auth

Instead of a machine user PAT, you can authenticate using a **GitHub App installation token**. This is useful for organizations that prefer app-based access control over personal tokens.

### 1. Create a GitHub App

1. Go to your org's **Settings → Developer settings → GitHub Apps → New GitHub App**
2. Set the required permissions (Pull requests: Read & write, Issues: Read & write)
3. Install the app on the target repositories
4. Note the **App ID**, **Installation ID**, and generate a **private key**

### 2. Configure Kitchen

Add the credentials to your `.env`:

```
TOPH_GITHUB_APP_ID=123456
TOPH_GITHUB_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\n...
TOPH_GITHUB_INSTALLATION_ID=12345678
```

No changes to `.kitchen.yaml` are needed — Kitchen auto-detects the app credentials by convention (`{PREFIX}_GITHUB_APP_ID`, etc.). If both PAT and app credentials are set, app auth takes precedence.

The MCP server uses `@octokit/auth-app` to automatically fetch and refresh installation tokens.

## @Mentioning the agent

Because the agent operates as a regular GitHub user, you can @mention it natively (e.g. `@toph-bot please review this PR`). For automated workflows that react to mentions, set up a webhook listener for `issue_comment` events and filter for `@toph-bot` in the comment body.

## Available Tools

- **`github_create_pull_request`** — create a PR (owner, repo, title, body, head, base)
- **`github_list_pull_requests`** — list PRs with optional state filter
- **`github_get_pull_request`** — get PR details (diff stats, description, mergeable status)
- **`github_add_pr_comment`** — add a comment to a PR

## Troubleshooting

- **"GITHUB_TOKEN not set"**: Check that `tokenEnv` in `.kitchen.yaml` matches the variable name in `.env`
- **401 Unauthorized**: Token may be expired or revoked — regenerate it from the machine user's account
- **403 Forbidden**: Token lacks required permissions — check repository access and PR scopes
- **Agent actions appear under wrong user**: Ensure the PAT belongs to the machine user, not your personal account
- **No GitHub config without errors**: If the env var is missing, Kitchen skips GitHub for that agent — check your `.env` file
