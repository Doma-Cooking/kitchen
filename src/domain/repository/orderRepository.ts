import { QueueSource } from '../../data/source/queue/queueSource.js';
import { OrderEntity, toOrderEntity, toOrderModel } from '../entity/orderEntity.js';
import { map, Observable } from 'rxjs';

export interface OrderRepository {
    queueOrder(order: OrderEntity): Promise<void>;
    getOrders(): Promise<OrderEntity[]>;
    deleteOrder(orderId: string): Promise<void>;
    watchAll(): Observable<OrderEntity[]>;
}

export class OrderRepositoryImpl implements OrderRepository {
    private source: QueueSource;

    constructor(source: QueueSource) {
        this.source = source;
    }

    async queueOrder(order: OrderEntity): Promise<void> {
        await this.source.queueOrder(toOrderModel(order));
    }

    async getOrders(): Promise<OrderEntity[]> {
        const orders = await this.source.getOrders();
        return orders.map(toOrderEntity);
    }

    async deleteOrder(orderId: string): Promise<void> {
        await this.source.deleteOrder(orderId);
    }

    watchAll(): Observable<OrderEntity[]> {
        return this.source.watchAll().pipe(
            map(models => models.map(toOrderEntity))
        );
    }
}
