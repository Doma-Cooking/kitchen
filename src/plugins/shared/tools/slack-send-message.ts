#!/usr/bin/env npx tsx

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { WebClient } from '@slack/web-api'
import { z } from 'zod'

const server = new McpServer({
  name: 'slack_send_message',
  version: '1.0.0',
})

server.tool(
  'slack_send_message',
  'Send a message to a Slack channel or thread',
  {
    channel: z.string().describe('Slack channel ID'),
    thread_ts: z.string().describe('Thread timestamp to reply in'),
    text: z.string().describe('Message text to send. Note: Slack uses single asterisks for bold (*bold*), not double.'),
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

const transport = new StdioServerTransport()
await server.connect(transport)
