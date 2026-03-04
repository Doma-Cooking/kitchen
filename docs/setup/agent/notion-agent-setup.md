# Notion Agent Setup

Give a Kitchen agent access to Notion — it can search, read, create, and update pages and databases.

## Prerequisites

- Kitchen running (`docker compose up`)
- A Notion workspace where you can create integrations

## 1. Create a Notion Internal Integration

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **New integration**
3. Set a name (e.g. "Kitchen — Toph")
4. Select the workspace the agent should access
5. Under **Capabilities**, enable:
   - **Read content**
   - **Update content**
   - **Insert content**
   - **Read comments**
   - **Create comments**
6. Click **Submit**
7. Go to the **Configuration** tab and copy the **Internal Integration Secret** (starts with `ntn_` or `secret_`)

## 2. Share Pages/Databases with the Integration

Notion integrations only have access to pages and databases explicitly shared with them:

1. Open the page or database in Notion
2. Click **...** (three dots) in the top-right → **Connections**
3. Find and add your integration
4. Repeat for each page or database the agent needs access to

## 3. Configure Kitchen

Add the token to your `.env`:

```
TOPH_NOTION_TOKEN=ntn_...
```

The naming convention `{AGENT_ID}_NOTION_TOKEN` is detected automatically. To override:

```yaml
agents:
  team:
    toph:
      displayName: "Toph"
      pluginPaths:
        - shared
        - domains/operations
      notion:
        tokenEnv: CUSTOM_NOTION_TOKEN
```

## 4. Verify

1. Start Kitchen: `docker compose up`
2. Ask the agent to search Notion (e.g. "search Notion for meeting notes")
3. The agent should return results from shared pages

## Available Tools

### Search
- **`notion_search`** — search pages and databases by query, optionally filter by type

### Pages
- **`notion_get_page`** — get a page by ID
- **`notion_create_page`** — create a page in a database or as a child of another page
- **`notion_update_page`** — update page properties

### Databases
- **`notion_get_database`** — get a database schema by ID
- **`notion_query_database`** — query a database with filters and sorts

### Blocks (Content)
- **`notion_get_block_children`** — get child blocks of a page/block (read page content)
- **`notion_append_blocks`** — append block children to a page/block (write content)
- **`notion_delete_block`** — delete (archive) a block

### Comments
- **`notion_create_comment`** — add a comment to a page or discussion thread
- **`notion_get_comments`** — get comments on a page or block

## Troubleshooting

- **"NOTION_TOKEN must be set"**: Check that your `.env` has `{AGENT_ID}_NOTION_TOKEN` (or the custom name from your yaml config)
- **Auth error after updating the token**: Kitchen caches config at startup — restart Kitchen (`docker compose restart`) for token changes to take effect
- **"Could not find ..." or 404 errors**: The integration doesn't have access to that page/database — share it via the Connections menu
- **403 Forbidden**: The integration lacks the required capability — check the integration settings at [notion.so/my-integrations](https://www.notion.so/my-integrations)
- **No Notion config without errors**: If the env var is missing, Kitchen skips Notion for that agent — check your `.env` file
