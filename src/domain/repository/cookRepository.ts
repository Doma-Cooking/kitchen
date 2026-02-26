import { concatMap, lastValueFrom } from 'rxjs';
import { CookSource } from '../../data/source/cook/cookSource.js';
import { QueueSource } from '../../data/source/queue/queueSource.js';

export interface CookRepository {
    createCook(id: string, queueName: string): Promise<void>;
}

export class CookRepositoryImpl implements CookRepository {
    private cookSource: CookSource;
    private queueSource: QueueSource;

    constructor(
        cookSource: CookSource,
        queueSource: QueueSource
    ) {
        this.cookSource = cookSource;
        this.queueSource = queueSource;
    }

    async createCook(id: string, queueName: string): Promise<void> {
        await this.queueSource.createCook(
            id,
            async (order, signal) => {
                const observable = this.cookSource.executeOrder(order, signal);

                const processed = observable.pipe(
                    concatMap(async messageModel => {
                        await this.queueSource.addOrderMessage(order.id, messageModel, queueName);
                    })
                );

                await lastValueFrom(processed);
            },
            queueName
        );
    }
}
