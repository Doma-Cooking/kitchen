#!/usr/bin/env npx tsx

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { WebClient } from '@slack/web-api'
import { z } from 'zod'

const server = new McpServer({
  name: 'slack',
  version: '1.0.0',
})

server.registerTool(
  'slack_send_message',
  {
    description: 'Send a message to a Slack channel or thread',
    inputSchema: {
      channel: z.string().describe('Slack channel ID'),
      thread_ts: z.string().describe('Thread timestamp to reply in'),
      text: z.string().describe('Message text to send. Note: Slack uses single asterisks for bold (*bold*), not double.'),
    },
  },
  async ({ channel, thread_ts, text }) => {
    const token = process.env['SLACK_BOT_TOKEN']
    if (!token) {
      return { content: [{ type: 'text' as const, text: 'Error: SLACK_BOT_TOKEN not set' }] }
    }

    const client = new WebClient(token)

    await client.chat.postMessage({
      channel,
      thread_ts,
      text,
    })

    return { content: [{ type: 'text' as const, text: `Message sent to ${channel} in thread ${thread_ts}` }] }
  },
)

server.registerTool(
  'slack_add_reaction',
  {
    description: 'Add an emoji reaction to a Slack message',
    inputSchema: {
      channel: z.string().describe('Slack channel ID'),
      timestamp: z.string().describe('Timestamp of the message to react to'),
      name: z.string().describe('Emoji name without colons (e.g. "thumbsup")'),
    },
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
