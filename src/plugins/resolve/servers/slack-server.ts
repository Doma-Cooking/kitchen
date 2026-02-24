import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { WebClient } from '@slack/web-api';

const token = process.env.SLACK_BOT_TOKEN;
if (!token) {
  console.error('SLACK_BOT_TOKEN is required');
  process.exit(1);
}

const slack = new WebClient(token);

const server = new McpServer({
  name: 'resolve-slack',
  version: '1.0.0',
});

server.registerTool(
  'slack_read_thread',
  {
    description: 'Read all replies in a Slack thread',
    inputSchema: {
      channel: z.string().describe('Slack channel ID'),
      thread_ts: z.string().describe('Thread timestamp'),
    },
  },
  async ({ channel, thread_ts }) => {
    const result = await slack.conversations.replies({ channel, ts: thread_ts });
    const messages = (result.messages ?? []).map(m => ({
      user: m.user,
      text: m.text,
      ts: m.ts,
    }));
    return { content: [{ type: 'text' as const, text: JSON.stringify(messages, null, 2) }] };
  }
);

server.registerTool(
  'slack_read_channel_history',
  {
    description: 'Read recent messages from a Slack channel',
    inputSchema: {
      channel: z.string().describe('Slack channel ID'),
      limit: z.number().optional().default(10).describe('Number of messages to fetch'),
    },
  },
  async ({ channel, limit }) => {
    const result = await slack.conversations.history({ channel, limit });
    const messages = (result.messages ?? []).map(m => ({
      user: m.user,
      text: m.text,
      ts: m.ts,
      thread_ts: m.thread_ts,
    }));
    return { content: [{ type: 'text' as const, text: JSON.stringify(messages, null, 2) }] };
  }
);

server.registerTool(
  'slack_get_channel_info',
  {
    description: 'Get information about a Slack channel',
    inputSchema: {
      channel: z.string().describe('Slack channel ID'),
    },
  },
  async ({ channel }) => {
    const result = await slack.conversations.info({ channel });
    const ch = result.channel;
    const info = {
      id: ch?.id,
      name: ch?.name,
      purpose: ch?.purpose?.value,
      topic: ch?.topic?.value,
    };
    return { content: [{ type: 'text' as const, text: JSON.stringify(info, null, 2) }] };
  }
);

server.registerTool(
  'slack_post_message',
  {
    description: 'Post a message to a Slack channel (for clarifying questions)',
    inputSchema: {
      channel: z.string().describe('Slack channel ID'),
      text: z.string().describe('Message text'),
      thread_ts: z.string().optional().describe('Thread timestamp to reply in'),
    },
  },
  async ({ channel, text, thread_ts }) => {
    const result = await slack.chat.postMessage({ channel, text, thread_ts });
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ ok: result.ok, ts: result.ts }, null, 2) }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
