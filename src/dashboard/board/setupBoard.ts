import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { Queue } from "bullmq";

export interface DashboardConfig {
  queueNames: string[];
  redisConnection: { host: string; port: number };
}

export function setupBoard(config: DashboardConfig): ExpressAdapter {
  const queues = config.queueNames.map(name =>
    new BullMQAdapter(new Queue(name, { connection: config.redisConnection }))
  );

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/dashboard");

  createBullBoard({
    queues,
    serverAdapter,
  });

  return serverAdapter;
}
