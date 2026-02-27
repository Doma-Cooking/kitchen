import { DelayedError, Queue, QueueEvents, Worker } from 'bullmq';
import { Redis, RedisOptions } from 'ioredis';
import { OrderModel } from '../../model/orderModel.js';
import { QueueSource } from './queueSource.js';
import { CookMessageModel } from '../../model/cookMessageModel.js';
import { concatMap, Observable } from 'rxjs';

interface NamedQueue {
  queue: Queue<OrderModel, void>;
  queueEvents: QueueEvents;
}

export class BullQueueSource implements QueueSource {
  private queues: Map<string, NamedQueue>;
  private connection: Redis;
  private redisConnection: RedisOptions;
  private workers: Map<string, Worker<OrderModel, void>>;

  constructor(
    queueNames: string[],
    connection: Redis,
    redisConnection: RedisOptions
  ) {
    this.connection = connection;
    this.redisConnection = redisConnection;
    this.workers = new Map();
    this.queues = new Map(queueNames.map((name) => [name, {
      queue: new Queue<OrderModel, void>(name, { connection: redisConnection }),
      queueEvents: new QueueEvents(name, { connection: redisConnection }),
    }]));
  }

  async initialize(): Promise<void> {
    await Promise.resolve();
  }

  async dispose(): Promise<void> {
    await Promise.all(
      [...this.queues.values()].flatMap(({ queue, queueEvents }) => [
        queue.close(),
        queueEvents.close(),
      ])
    );
  }

  private getQueue(queueName: string): NamedQueue {
    const entry = this.queues.get(queueName);
    if (!entry) {
      throw new Error(`Queue "${queueName}" not found. Available queues: ${[...this.queues.keys()].join(', ')}`);
    }
    return entry;
  }

  async createCook(
    id: string,
    execute: (order: OrderModel, signal?: AbortSignal) => Promise<void>,
    queueName: string
  ): Promise<void> {
    await Promise.resolve();

    const { queue } = this.getQueue(queueName);
    this.workers.set(
      id,
      new Worker(
        queue.name,
        async (job, token, signal) => {
          const stationId = job.data.stationId;
          if (stationId) {
            const lockKey = `station:lock:${stationId}`;
            const acquired = await this.connection.set(lockKey, job.id ?? '', 'EX', 86400, 'NX');
            if (!acquired) {
              await job.moveToDelayed(Date.now() + 10000, token);
              throw new DelayedError();
            }
            try {
              await execute(job.data, signal);
            } finally {
              await this.connection.del(lockKey);
            }
          } else {
            await execute(job.data, signal);
          }
        },
        { connection: this.redisConnection, lockDuration: 300000 }
      )
    );
  }

  async queueOrder(order: OrderModel, queueName: string): Promise<void> {
    const { queue } = this.getQueue(queueName);
    await queue.add(order.name, order, { jobId: order.id });
  }

  async addOrderMessage(orderId: string, message: CookMessageModel, queueName: string): Promise<void> {
    const { queue } = this.getQueue(queueName);
    const job = await queue.getJob(orderId);
    if (job) {
      await Promise.all([
        job.log(JSON.stringify(message)),
        job.updateProgress(message)
      ]);
    }
  }

  async getOrders(queueName: string): Promise<OrderModel[]> {
    const { queue } = this.getQueue(queueName);
    const jobs = await queue.getJobs();
    return jobs.map((job) => job.data);
  }

  async deleteOrder(orderId: string, queueName: string): Promise<void> {
    const { queue } = this.getQueue(queueName);
    const job = await queue.getJob(orderId);
    const state = await job?.getState();

    if (!job || !state || state === 'active') {
      return;
    } else {
      await job.remove();
    }
  }

  watchAll(queueName: string): Observable<OrderModel[]> {
    const { queueEvents } = this.getQueue(queueName);
    return new Observable((subscriber) => {
      queueEvents.on('added', (args) => {
        subscriber.next(`${args.jobId}-added`);
      });

      queueEvents.on('progress', (args) => {
        subscriber.next(`${args.jobId}-progress`);
      });

      queueEvents.on('completed', (args) => {
        subscriber.next(`${args.jobId}-completed`);
      });

      queueEvents.on('failed', (args) => {
        subscriber.next(`${args.jobId}-failed`);
      });

      queueEvents.on('removed', (args) => {
        subscriber.next(`${args.jobId}-removed`);
      });

      queueEvents.on('cleaned', () => {
        subscriber.next(`cleaned`);
      });
    }).pipe(
      concatMap(async () => {
        return await this.getOrders(queueName);
      })
    );
  }
}
