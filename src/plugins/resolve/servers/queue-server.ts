import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { Queue } from 'bullmq';

const redisHost = process.env.REDIS_HOST ?? 'localhost';
const redisPort = Number(process.env.REDIS_PORT ?? '6379');
const queueName = process.env.QUEUE_NAME ?? 'kitchenQueue';

const queue = new Queue(queueName, {
  connection: { host: redisHost, port: redisPort, maxRetriesPerRequest: null },
});

const server = new McpServer({
  name: 'resolve-queue',
  version: '1.0.0',
});

server.registerTool(
  'queue_order',
  {
    description: 'Queue a resolved order for processing. Call this once per order you want to create.',
    inputSchema: {
      name: z.string().describe('Descriptive order name'),
      recipeId: z.string().describe('Recipe ID to execute'),
      input: z.record(z.string(), z.unknown()).optional().describe('Recipe input parameters'),
      stationId: z.string().optional().describe('Station ID for grouping related orders'),
    },
  },
  async ({ name, recipeId, input, stationId }) => {
    const orderId = randomUUID();
    await queue.add(orderId, { id: orderId, name, recipeId, input, stationId });
    console.error(`[queue-server] Queued order ${orderId}: ${name} (${recipeId})`);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ ok: true, orderId }) }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
