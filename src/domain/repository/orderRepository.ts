import { QueueSource } from '../../data/source/queue/queueSource.js';
import { OrderEntity, toOrderEntity, toOrderModel } from '../entity/orderEntity.js';
import { map, Observable } from 'rxjs';

export interface OrderRepository {
    queueOrder(order: OrderEntity, queueName: string): Promise<void>;
    getOrders(queueName: string): Promise<OrderEntity[]>;
    deleteOrder(orderId: string, queueName: string): Promise<void>;
    watchAll(queueName: string): Observable<OrderEntity[]>;
}

export class OrderRepositoryImpl implements OrderRepository {
    private source: QueueSource;

    constructor(source: QueueSource) {
        this.source = source;
    }

    async queueOrder(order: OrderEntity, queueName: string): Promise<void> {
        await this.source.queueOrder(toOrderModel(order), queueName);
    }

    async getOrders(queueName: string): Promise<OrderEntity[]> {
        const orders = await this.source.getOrders(queueName);
        return orders.map(toOrderEntity);
    }

    async deleteOrder(orderId: string, queueName: string): Promise<void> {
        await this.source.deleteOrder(orderId, queueName);
    }

    watchAll(queueName: string): Observable<OrderEntity[]> {
        return this.source.watchAll(queueName).pipe(
            map(models => models.map(toOrderEntity))
        );
    }
}
