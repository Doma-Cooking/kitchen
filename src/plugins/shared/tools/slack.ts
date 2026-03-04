#!/usr/bin/env npx tsx

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { WebClient } from '@slack/web-api'
import { z } from 'zod'

const server = new McpServer({
  name: 'slack',
  version: '1.0.0',
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Slack message types are complex unions
function formatMessage(m: any): string {
  let line = `[${m.ts}] <${m.user}>: ${m.text}`
  if (m.files?.length) {
    const fileInfo = m.files.map((f: any) => `${f.name} (${f.mimetype})`).join(', ')
    line += ` [files: ${fileInfo}]`
  }
  return line
}

server.registerTool(
  'slack_send_message',
  {
    description: 'Send a message to a Slack channel or thread',
    inputSchema: {
      channel: z.string().describe('Slack channel ID'),
      thread_ts: z.string().optional().describe('Thread timestamp to reply in. Omit to post at the top level of the channel.'),
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

    const target = thread_ts ? `thread ${thread_ts} in ${channel}` : channel
    return { content: [{ type: 'text' as const, text: `Message sent to ${target}` }] }
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

server.registerTool(
  'slack_get_thread_replies',
  {
    description: 'Get all replies in a Slack thread',
    inputSchema: {
      channel: z.string().describe('Slack channel ID'),
      thread_ts: z.string().describe('Timestamp of the parent message'),
      limit: z.number().optional().describe('Max replies to return (default 100)'),
    },
  },
  async ({ channel, thread_ts, limit }) => {
    const token = process.env['SLACK_BOT_TOKEN']
    if (!token) {
      return { content: [{ type: 'text' as const, text: 'Error: SLACK_BOT_TOKEN not set' }] }
    }

    const client = new WebClient(token)
    const result = await client.conversations.replies({ channel, ts: thread_ts, limit: limit ?? 100 })

    const messages = (result.messages ?? []).map(formatMessage).join('\n')
    return { content: [{ type: 'text' as const, text: messages || 'No replies found.' }] }
  },
)

server.registerTool(
  'slack_get_channel_history',
  {
    description: 'Get recent messages from a Slack channel',
    inputSchema: {
      channel: z.string().describe('Slack channel ID'),
      limit: z.number().optional().describe('Max messages to return (default 20)'),
      oldest: z.string().optional().describe('Only messages after this Unix timestamp'),
      latest: z.string().optional().describe('Only messages before this Unix timestamp'),
    },
  },
  async ({ channel, limit, oldest, latest }) => {
    const token = process.env['SLACK_BOT_TOKEN']
    if (!token) {
      return { content: [{ type: 'text' as const, text: 'Error: SLACK_BOT_TOKEN not set' }] }
    }

    const client = new WebClient(token)
    const result = await client.conversations.history({ channel, limit: limit ?? 20, oldest, latest })

    const messages = (result.messages ?? []).map(formatMessage).join('\n')
    return { content: [{ type: 'text' as const, text: messages || 'No messages found.' }] }
  },
)

server.registerTool(
  'slack_get_message',
  {
    description: 'Get a single Slack message by timestamp, including file attachments and full metadata',
    inputSchema: {
      channel: z.string().describe('Slack channel ID'),
      ts: z.string().describe('Timestamp of the message to fetch'),
    },
  },
  async ({ channel, ts }) => {
    const token = process.env['SLACK_BOT_TOKEN']
    if (!token) {
      return { content: [{ type: 'text' as const, text: 'Error: SLACK_BOT_TOKEN not set' }] }
    }

    const client = new WebClient(token)
    const result = await client.conversations.history({ channel, latest: ts, inclusive: true, limit: 1 })

    const msg = result.messages?.[0]
    if (!msg) return { content: [{ type: 'text' as const, text: 'Message not found.' }] }

    const parts = [
      `ts: ${msg.ts}`,
      `user: ${msg.user}`,
      `text: ${msg.text}`,
    ]
    if (msg.files?.length) {
      parts.push(`files: ${msg.files.map((f) => `${f.name} (${f.mimetype}, ${f.url_private})`).join(', ')}`)
    }
    if (msg.reactions?.length) {
      parts.push(`reactions: ${msg.reactions.map((r) => `:${r.name}: (${r.count})`).join(', ')}`)
    }
    return { content: [{ type: 'text' as const, text: parts.join('\n') }] }
  },
)

server.registerTool(
  'slack_search_messages',
  {
    description: 'Search for messages across the Slack workspace. Requires a user token (xoxp-), not a bot token.',
    inputSchema: {
      query: z.string().describe('Search query string'),
      count: z.number().optional().describe('Max results to return (default 20)'),
      sort: z.enum(['score', 'timestamp']).optional().describe('Sort order (default: score)'),
    },
  },
  async ({ query, count, sort }) => {
    const token = process.env['SLACK_USER_TOKEN']
    if (!token) {
      return {
        content: [{
          type: 'text' as const,
          text: 'Error: SLACK_USER_TOKEN not set. search.messages requires a user token (xoxp-*), not a bot token. See slack-agent-setup.md for configuration.',
        }],
      }
    }

    const client = new WebClient(token)
    const result = await client.search.messages({ query, count: count ?? 20, sort: sort ?? 'score' })

    const matches = (result.messages?.matches ?? [])
      .map((m) => `[${m.ts}] #${m.channel?.name ?? m.channel?.id} <${m.user}>: ${m.text}`)
      .join('\n')
    return { content: [{ type: 'text' as const, text: matches || 'No messages found.' }] }
  },
)

server.registerTool(
  'slack_get_user_info',
  {
    description: 'Get information about a Slack user by their user ID',
    inputSchema: {
      user: z.string().describe('Slack user ID (e.g. U01234ABCDE)'),
    },
  },
  async ({ user }) => {
    const token = process.env['SLACK_BOT_TOKEN']
    if (!token) {
      return { content: [{ type: 'text' as const, text: 'Error: SLACK_BOT_TOKEN not set' }] }
    }

    const client = new WebClient(token)
    const result = await client.users.info({ user })

    const u = result.user
    if (!u) return { content: [{ type: 'text' as const, text: 'User not found.' }] }

    const info = [
      `Name: ${u.real_name ?? u.name}`,
      `Display name: ${u.profile?.display_name}`,
      `Title: ${u.profile?.title}`,
      `Email: ${u.profile?.email}`,
      `Is bot: ${u.is_bot}`,
      `Timezone: ${u.tz}`,
    ].join('\n')
    return { content: [{ type: 'text' as const, text: info }] }
  },
)

server.registerTool(
  'slack_list_channels',
  {
    description: 'List Slack channels in the workspace',
    inputSchema: {
      types: z.string().optional().describe('Comma-separated channel types: public_channel, private_channel, mpim, im (default: public_channel)'),
      limit: z.number().optional().describe('Max channels to return (default 100)'),
      exclude_archived: z.boolean().optional().describe('Exclude archived channels (default true)'),
    },
  },
  async ({ types, limit, exclude_archived }) => {
    const token = process.env['SLACK_BOT_TOKEN']
    if (!token) {
      return { content: [{ type: 'text' as const, text: 'Error: SLACK_BOT_TOKEN not set' }] }
    }

    const client = new WebClient(token)
    const result = await client.conversations.list({
      types: types ?? 'public_channel',
      limit: limit ?? 100,
      exclude_archived: exclude_archived ?? true,
    })

    const channels = (result.channels ?? [])
      .map((c) => `${c.id} #${c.name} — ${c.topic?.value || '(no topic)'}`)
      .join('\n')
    return { content: [{ type: 'text' as const, text: channels || 'No channels found.' }] }
  },
)

server.registerTool(
  'slack_update_message',
  {
    description: 'Update (edit) a previously sent Slack message',
    inputSchema: {
      channel: z.string().describe('Slack channel ID'),
      ts: z.string().describe('Timestamp of the message to update'),
      text: z.string().describe('New message text'),
    },
  },
  async ({ channel, ts, text }) => {
    const token = process.env['SLACK_BOT_TOKEN']
    if (!token) {
      return { content: [{ type: 'text' as const, text: 'Error: SLACK_BOT_TOKEN not set' }] }
    }

    const client = new WebClient(token)
    await client.chat.update({ channel, ts, text })

    return { content: [{ type: 'text' as const, text: `Message ${ts} updated in ${channel}` }] }
  },
)

server.registerTool(
  'slack_upload_file',
  {
    description: 'Upload a file to a Slack channel (from string content)',
    inputSchema: {
      channel_id: z.string().describe('Slack channel ID to upload to'),
      content: z.string().describe('File content as a string'),
      filename: z.string().describe('Filename (e.g. "report.txt")'),
      title: z.string().optional().describe('Display title for the file'),
      initial_comment: z.string().optional().describe('Message to include with the upload'),
      thread_ts: z.string().optional().describe('Thread timestamp to upload in'),
    },
  },
  async ({ channel_id, content, filename, title, initial_comment, thread_ts }) => {
    const token = process.env['SLACK_BOT_TOKEN']
    if (!token) {
      return { content: [{ type: 'text' as const, text: 'Error: SLACK_BOT_TOKEN not set' }] }
    }

    const client = new WebClient(token)
    const shared = { channel_id, content, filename, title, initial_comment } as const
    await client.filesUploadV2(thread_ts ? { ...shared, thread_ts } : shared)

    return { content: [{ type: 'text' as const, text: `File "${filename}" uploaded to ${channel_id}` }] }
  },
)

server.registerTool(
  'slack_set_channel_topic',
  {
    description: 'Set the topic of a Slack channel',
    inputSchema: {
      channel: z.string().describe('Slack channel ID'),
      topic: z.string().describe('New channel topic text'),
    },
  },
  async ({ channel, topic }) => {
    const token = process.env['SLACK_BOT_TOKEN']
    if (!token) {
      return { content: [{ type: 'text' as const, text: 'Error: SLACK_BOT_TOKEN not set' }] }
    }

    const client = new WebClient(token)
    await client.conversations.setTopic({ channel, topic })

    return { content: [{ type: 'text' as const, text: `Topic set for ${channel}` }] }
  },
)

const transport = new StdioServerTransport()
await server.connect(transport)
