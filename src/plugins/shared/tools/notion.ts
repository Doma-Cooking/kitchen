#!/usr/bin/env npx tsx

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { Client } from '@notionhq/client'
import { z } from 'zod'

const server = new McpServer({
  name: 'notion',
  version: '1.0.0',
  description:
    'Notion API tools. IMPORTANT: (1) Never run Notion tool calls in parallel — a single failure cascades to all siblings. (2) Each database has two IDs in search results (data_source_id and URL-based database_id) — they are NOT interchangeable.',
})

function getClient(): Client {
  const token = process.env['NOTION_TOKEN']
  if (!token) throw new Error('NOTION_TOKEN must be set')
  return new Client({ auth: token })
}

const JsonObject = z.record(z.string(), z.unknown())
const JsonObjectArray = z.array(z.record(z.string(), z.unknown()))

// ── Search ────────────────────────────────────────────────────────

server.registerTool(
  'notion_search',
  {
    description:
      'Search pages and databases by query. NOTE: Each database result contains two IDs — the top-level "id" is the data_source_id (for notion_query_database), and the "url" field contains the URL-based database ID (for notion_get_database / notion_create_page). These are NOT interchangeable.',
    inputSchema: {
      query: z.string().optional().describe('Search query text'),
      filter: z.enum(['page', 'data_source']).optional().describe('Filter by object type (page or data_source)'),
      pageSize: z.number().optional().describe('Number of results (max 100)'),
      startCursor: z.string().optional().describe('Pagination cursor'),
    },
  },
  async ({ query, filter, pageSize, startCursor }) => {
    const results = await getClient().search({
      query,
      filter: filter ? { value: filter, property: 'object' } : undefined,
      page_size: pageSize,
      start_cursor: startCursor,
    })
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }],
    }
  },
)

// ── Pages ─────────────────────────────────────────────────────────

server.registerTool(
  'notion_get_page',
  {
    description: 'Get a page by ID',
    inputSchema: {
      pageId: z.string().describe('Page ID'),
    },
  },
  async ({ pageId }) => {
    const page = await getClient().pages.retrieve({ page_id: pageId })
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(page, null, 2) }],
    }
  },
)

server.registerTool(
  'notion_create_page',
  {
    description: 'Create a page in a database or as a child of another page',
    inputSchema: {
      parentDatabaseId: z
        .string()
        .optional()
        .describe(
          'URL-based database ID — from the "url" field in notion_search results or parent.database_id (mutually exclusive with parentPageId). Do NOT use the data_source_id.',
        ),
      parentPageId: z.string().optional().describe('Parent page ID (mutually exclusive with parentDatabaseId)'),
      properties: JsonObject.describe('Page properties object'),
      children: JsonObjectArray.optional().describe('Block children to add as page content'),
    },
  },
  async ({ parentDatabaseId, parentPageId, properties, children }) => {
    let parent: { database_id: string } | { page_id: string }
    if (parentDatabaseId) {
      parent = { database_id: parentDatabaseId }
    } else if (parentPageId) {
      parent = { page_id: parentPageId }
    } else {
      return { content: [{ type: 'text' as const, text: 'Error: either parentDatabaseId or parentPageId is required' }], isError: true }
    }
    const page = await getClient().pages.create({
      parent,
      properties: properties as Record<string, unknown>,
      children: children as unknown[],
    } as Parameters<typeof Client.prototype.pages.create>[0])
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(page, null, 2) }],
    }
  },
)

server.registerTool(
  'notion_update_page',
  {
    description: 'Update page properties',
    inputSchema: {
      pageId: z.string().describe('Page ID'),
      properties: JsonObject.describe('Properties to update'),
    },
  },
  async ({ pageId, properties }) => {
    const page = await getClient().pages.update({
      page_id: pageId,
      properties: properties as Record<string, unknown>,
    } as Parameters<typeof Client.prototype.pages.update>[0])
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(page, null, 2) }],
    }
  },
)

// ── Databases ─────────────────────────────────────────────────────

server.registerTool(
  'notion_get_database',
  {
    description:
      'Get a database schema by ID. IMPORTANT: Use the URL-based database ID (from the "url" field in notion_search results, or parent.database_id), NOT the data_source_id (top-level "id"). Using the wrong ID returns "database not found."',
    inputSchema: {
      databaseId: z.string().describe('URL-based database ID — from the "url" field in notion_search results or parent.database_id'),
    },
  },
  async ({ databaseId }) => {
    const db = await getClient().databases.retrieve({ database_id: databaseId })
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(db, null, 2) }],
    }
  },
)

server.registerTool(
  'notion_query_database',
  {
    description:
      'Query a database with optional filters and sorts. IMPORTANT: Use the data_source_id (the top-level "id" field from notion_search results), NOT the URL-based database ID. Using the wrong ID returns "database not found."',
    inputSchema: {
      databaseId: z.string().describe('data_source_id — the top-level "id" from notion_search results'),
      filter: JsonObject.optional().describe('Notion filter object'),
      sorts: JsonObjectArray.optional().describe('Notion sorts array'),
      pageSize: z.number().optional().describe('Number of results (max 100)'),
      startCursor: z.string().optional().describe('Pagination cursor'),
    },
  },
  async ({ databaseId, filter, sorts, pageSize, startCursor }) => {
    const results = await getClient().dataSources.query({
      data_source_id: databaseId,
      filter: filter as Parameters<typeof Client.prototype.dataSources.query>[0]['filter'],
      sorts: sorts as Parameters<typeof Client.prototype.dataSources.query>[0]['sorts'],
      page_size: pageSize,
      start_cursor: startCursor,
    })
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }],
    }
  },
)

// ── Blocks ────────────────────────────────────────────────────────

server.registerTool(
  'notion_get_block_children',
  {
    description: 'Get child blocks of a page or block (read page content)',
    inputSchema: {
      blockId: z.string().describe('Block or page ID'),
      pageSize: z.number().optional().describe('Number of results (max 100)'),
      startCursor: z.string().optional().describe('Pagination cursor'),
    },
  },
  async ({ blockId, pageSize, startCursor }) => {
    const results = await getClient().blocks.children.list({
      block_id: blockId,
      page_size: pageSize,
      start_cursor: startCursor,
    })
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }],
    }
  },
)

server.registerTool(
  'notion_append_blocks',
  {
    description: 'Append block children to a page or block (write content)',
    inputSchema: {
      blockId: z.string().describe('Block or page ID to append to'),
      children: JsonObjectArray.describe('Array of block objects to append'),
    },
  },
  async ({ blockId, children }) => {
    const results = await getClient().blocks.children.append({
      block_id: blockId,
      children: children as Parameters<typeof Client.prototype.blocks.children.append>[0]['children'],
    })
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }],
    }
  },
)

server.registerTool(
  'notion_delete_block',
  {
    description: 'Delete (archive) a block',
    inputSchema: {
      blockId: z.string().describe('Block ID to delete'),
    },
  },
  async ({ blockId }) => {
    const result = await getClient().blocks.delete({ block_id: blockId })
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    }
  },
)

// ── Comments ──────────────────────────────────────────────────────

server.registerTool(
  'notion_create_comment',
  {
    description: 'Add a comment to a page or discussion',
    inputSchema: {
      parentPageId: z.string().optional().describe('Page ID to comment on (creates a new discussion)'),
      discussionId: z.string().optional().describe('Discussion thread ID to reply to'),
      richText: JsonObjectArray.describe('Rich text array for the comment body'),
    },
  },
  async ({ parentPageId, discussionId, richText }) => {
    const params: Record<string, unknown> = {
      rich_text: richText,
    }
    if (parentPageId) params.parent = { page_id: parentPageId }
    if (discussionId) params.discussion_id = discussionId
    const result = await getClient().comments.create(params as Parameters<typeof Client.prototype.comments.create>[0])
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    }
  },
)

server.registerTool(
  'notion_get_comments',
  {
    description: 'Get comments on a page or block',
    inputSchema: {
      blockId: z.string().describe('Block or page ID'),
      pageSize: z.number().optional().describe('Number of results (max 100)'),
      startCursor: z.string().optional().describe('Pagination cursor'),
    },
  },
  async ({ blockId, pageSize, startCursor }) => {
    const results = await getClient().comments.list({
      block_id: blockId,
      page_size: pageSize,
      start_cursor: startCursor,
    })
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }],
    }
  },
)

const transport = new StdioServerTransport()
await server.connect(transport)
