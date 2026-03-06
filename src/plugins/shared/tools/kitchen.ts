#!/usr/bin/env npx tsx

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { Queue } from 'bullmq'
import { z } from 'zod'

const QUEUE_NAME = 'agent-events'

const redisUrl = process.env['REDIS_URL']
if (!redisUrl) {
  throw new Error('REDIS_URL environment variable is required')
}

const queue = new Queue(QUEUE_NAME, { connection: { url: redisUrl } })

const cleanup = async () => {
  await queue.close()
  process.exit(0)
}
process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

const server = new McpServer({
  name: 'kitchen',
  version: '1.0.0',
})

server.registerTool(
  'create_agent_event',
  {
    description: 'Create an event to trigger an agent. Use this to delegate work or send messages to other agents or yourself in the kitchen.',
    inputSchema: {
      agentId: z.string().describe('Target agent ID to invoke'),
      message: z.string().describe('The prompt/message for the target agent'),
      memoryId: z.string().optional().describe('Optional memory session ID to resume a previous conversation'),
      data: z.record(z.string(), z.unknown()).optional().describe('Arbitrary data to include in the prompt/message'),
      delay: z.number().int().min(0).optional().describe('Delay in seconds before the event is processed'),
    },
  },
  async ({ agentId, message, memoryId, data, delay }) => {
    const event = {
      id: crypto.randomUUID(),
      trigger: { type: 'agent' as const, data: data ?? {} },
      agentId,
      memoryId,
      message,
      timestamp: new Date().toISOString(),
    }

    await queue.add('agent-event', event, { jobId: event.id, delay: delay ? delay * 1000 : undefined })

    return {
      content: [{
        type: 'text' as const,
        text: `Event ${event.id} created for agent "${agentId}"`,
      }],
    }
  },
)

const transport = new StdioServerTransport()
await server.connect(transport)
