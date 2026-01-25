import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { Queue } from "bullmq";
import type { Configuration } from "../config/configuration.js";

export interface BoardSetup {
  serverAdapter: ExpressAdapter;
  queue: Queue;
}

export function setupBoard(config: Configuration): BoardSetup {
  const queue = new Queue(config.kitchenQueueName, {
    connection: config.redisConnection,
  });

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/");

  createBullBoard({
    queues: [new BullMQAdapter(queue)],
    serverAdapter,
  });

  return { serverAdapter, queue };
}
