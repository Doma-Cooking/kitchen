# Notion Setup

Connect Kitchen agents to Notion so they can read and write pages using the Notion Enhanced Markdown API.

## Prerequisites

- A Notion workspace where you can create integrations
- Kitchen running (`docker compose up`)

## 1. Create a Notion Integration

1. Go to [notion.so/profile/integrations](https://www.notion.so/profile/integrations)
2. Click **New integration**
3. Name it (e.g. `Kitchen`) and select your workspace
4. Set capabilities: **Read content**, **Update content**, **Insert content**
5. Click **Save**
6. Copy the **Internal Integration Secret** — this is your API key

## 2. Grant the Integration Access to Pages

Notion integrations can only access pages they've been explicitly connected to. For each top-level page the agents need to access:

1. Open the page in Notion
2. Click **···** (top-right) → **Connect to** → select your integration

Pages nested under a connected parent are automatically accessible.

## 3. Configure Kitchen

Add to your `.env`:

```
NOTION_API_KEY=secret_...
```

No `.kitchen.yaml` change is needed — Notion uses a single shared integration key, not per-agent credentials.

## Available Tools

Run `kitchen-notion --help` to see all available commands.

## Troubleshooting

- **"NOTION_API_KEY not set"**: Add `NOTION_API_KEY` to your `.env` and restart
- **"Could not find page" / 404**: The integration hasn't been connected to that page — follow step 2 above
- **"Unauthorized" / 401**: The API key is wrong or has been rotated — update `NOTION_API_KEY` in `.env`
- **"API version" errors**: Override the version header with `NOTION_API_VERSION=<version>` in `.env` (default is `2022-06-28`, Notion's stable public version)
