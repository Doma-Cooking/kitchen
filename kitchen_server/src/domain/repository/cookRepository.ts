import { concatMap, lastValueFrom } from 'rxjs';
import { CookSource } from '../../data/source/cook/cookSource.js';
import { OrderSource } from '../../data/source/order/orderSource.js';

export interface CookRepository {
    createCook(id: string): Promise<void>;
}

export class CookRepositoryImpl implements CookRepository {
    private cookSource: CookSource;
    private orderSource: OrderSource;

    constructor(
        cookSource: CookSource,
        orderSource: OrderSource
    ) {
        this.cookSource = cookSource;
        this.orderSource = orderSource;
    }

    async createCook(id: string): Promise<void> {
        await this.orderSource.createCook(
            id,
            async (order, signal) => {
                const observable = this.cookSource.executeOrder(order, signal);

                const processed = observable.pipe(
                    concatMap(async messageModel => {
                        await this.orderSource.addOrderMessage(order.id, messageModel);
                    })
                );

                await lastValueFrom(processed);
            }
        );
    }
}
