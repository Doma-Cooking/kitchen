import { Queue, QueueEvents, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { OrderModel } from '../../model/orderModel.js';
import { OrderSource } from './orderSource.js';
import { CookMessageModel } from '../../model/cookMessageModel.js';
import { concatMap, Observable } from 'rxjs';

export class BullOrderSource implements OrderSource {
    private queue: Queue<OrderModel, void>;
    private queueEvents: QueueEvents;
    private connection: Redis
    private workers: Map<string, Worker<OrderModel, void>>;

    constructor(
        queue: Queue<OrderModel, void>,
        queueEvents: QueueEvents,
        connection: Redis
    ) {
        this.queue = queue;
        this.queueEvents = queueEvents;
        this.connection = connection;
        this.workers = new Map();
    }

    async createCook(
        id: string,
        execute: (order: OrderModel, signal: AbortSignal | undefined) => Promise<void>
    ): Promise<void> {
        await Promise.resolve();
        this.workers.set(
            id,
            new Worker(
                this.queue.name,
                async (job, _, signal) => {
                    await execute(job.data, signal);
                },
                { connection: this.connection }
            )
        );
    }

    async queueOrder(order: OrderModel): Promise<void> {
        await this.queue.add(order.name, order, { jobId: order.id });
    }

    async addOrderMessage(orderId: string, message: CookMessageModel): Promise<void> {
        const job = await this.queue.getJob(orderId);
        if (job) {
            await Promise.all([
                job.log(JSON.stringify(message)),
                job.updateProgress(message)
            ]);
        }
    }

    async getOrders(): Promise<OrderModel[]> {
        const jobs = await this.queue.getJobs();
        return jobs.map((job) => job.data);
    }

    async deleteOrder(orderId: string): Promise<void> {
        const job = await this.queue.getJob(orderId);
        const state = await job?.getState();

        if (!job || !state || state === 'active') {
            return;
        } else {
            await job.remove();
        }
    }

    watchAll(): Observable<OrderModel[]> {
        return new Observable((subscriber) => {
            this.queueEvents.on('added', (args) => {
                subscriber.next(`${args.jobId}-added`);
            });

            this.queueEvents.on('progress', (args) => {
                subscriber.next(`${args.jobId}-progress`);
            });

            this.queueEvents.on('completed', (args) => {
                subscriber.next(`${args.jobId}-completed`);
            });

            this.queueEvents.on('failed', (args) => {
                subscriber.next(`${args.jobId}-failed`);
            });

            this.queueEvents.on('removed', (args) => {
                subscriber.next(`${args.jobId}-removed`);
            });

            this.queueEvents.on('cleaned', () => {
                subscriber.next(`cleaned`);
            });
        }).pipe(
            concatMap(async () => {
                return await this.getOrders();
            })
        );
    }
}
