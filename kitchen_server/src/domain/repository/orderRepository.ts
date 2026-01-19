import { map, Observable } from 'rxjs';
import { OrderSource } from '../../data/source/order/orderSource.js';
import { OrderEntity, OrderStatus, toOrderEntity } from '../entity/orderEntity.js';
import { CookStatusMessageEntity, toCookStatusMessageModel } from '../entity/cookMessageEntity.js';

export interface OrderRepository {
    createOrder(input: string | null, procedureName: string | null, stationId: string | null): Promise<OrderEntity>;
    getOrderById(orderId: string): Promise<OrderEntity | null>;
    addMessageToOrder(orderId: string, message: CookStatusMessageEntity): Promise<void>;
    updateOrderStatus(orderId: string, status: OrderStatus): Promise<void>;
    deleteOrder(orderId: string): Promise<void>;
    watchAll(): Observable<OrderEntity[]>;
}

export class OrderRepositoryImpl implements OrderRepository {
    private source: OrderSource;

    constructor(source: OrderSource) {
        this.source = source;
    }

    async createOrder(input: string | null, procedureName: string | null, stationId: string | null): Promise<OrderEntity> {
        const model = await this.source.createOrder(input, procedureName, stationId);
        return toOrderEntity(model);
    }

    async getOrderById(orderId: string): Promise<OrderEntity | null> {
        const model = await this.source.getOrderById(orderId);
        return model ? toOrderEntity(model) : null;
    }

    async addMessageToOrder(orderId: string, message: CookStatusMessageEntity): Promise<void> {
        await this.source.addMessageToOrder(orderId, toCookStatusMessageModel(message));
    }

    async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
        await this.source.updateOrderStatus(orderId, status);
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
