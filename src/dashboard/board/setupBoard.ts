import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { Queue } from "bullmq";

export interface DashboardConfig {
  queueName: string;
  redisConnection: { host: string; port: number };
}

export function setupBoard(config: DashboardConfig): ExpressAdapter {
  const queue = new Queue(config.queueName, {
    connection: config.redisConnection,
  });

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/dashboard");

  createBullBoard({
    queues: [new BullMQAdapter(queue)],
    serverAdapter,
  });

  return serverAdapter;
}
