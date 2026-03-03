#!/usr/bin/env npx tsx

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { WebClient } from '@slack/web-api'
import { z } from 'zod'

const server = new McpServer({
  name: 'slack_add_reaction',
  version: '1.0.0',
})

server.tool(
  'slack_add_reaction',
  'Add an emoji reaction to a Slack message',
  {
    channel: z.string().describe('Slack channel ID'),
    timestamp: z.string().describe('Timestamp of the message to react to'),
    name: z.string().describe('Emoji name without colons (e.g. "thumbsup")'),
  },
  async ({ channel, timestamp, name }) => {
    const token = process.env['SLACK_BOT_TOKEN']
    if (!token) {
      return { content: [{ type: 'text' as const, text: 'Error: SLACK_BOT_TOKEN not set' }] }
    }

    const client = new WebClient(token)

    await client.reactions.add({
      channel,
      timestamp,
      name,
    })

    return { content: [{ type: 'text' as const, text: `Reacted with :${name}: in ${channel}` }] }
  },
)

const transport = new StdioServerTransport()
await server.connect(transport)
