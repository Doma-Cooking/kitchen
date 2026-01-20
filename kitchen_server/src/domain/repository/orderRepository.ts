import { BehaviorSubject, map, Observable, Subscription } from 'rxjs';
import { OrderSource } from '../../data/source/order/orderSource.js';
import { OrderEntity, OrderStatus, toOrderEntity } from '../entity/orderEntity.js';
import { CookStatusMessageEntity, toCookStatusMessageModel } from '../entity/cookMessageEntity.js';
import { Disposable } from '../../di/disposable.js';

export interface OrderRepository extends Disposable {
    createOrder(input: string | null, procedureName: string | null, stationId: string | null): Promise<OrderEntity>;
    getOrderById(orderId: string): Promise<OrderEntity | null>;
    addMessageToOrder(orderId: string, message: CookStatusMessageEntity): Promise<void>;
    updateOrderStatus(orderId: string, status: OrderStatus): Promise<void>;
    deleteOrder(orderId: string): Promise<void>;
    watchAll(): Observable<OrderEntity[]>;
}

export class OrderRepositoryImpl implements OrderRepository {
    private source: OrderSource;
    private ordersSubject = new BehaviorSubject<OrderEntity[]>([]);
    private subscription: Subscription | null = null;

    constructor(source: OrderSource) {
        this.source = source;
    }

    async initialize(): Promise<void> {
        await Promise.resolve();

        this.subscription = this.source.watchAll().pipe(
            map(models => models.map(toOrderEntity))
        ).subscribe({
            next: orders => { this.ordersSubject.next(orders); },
            error: err => { console.error('Order watch error:', err); }
        });
    }

    async dispose(): Promise<void> {
        await Promise.resolve();

        this.subscription?.unsubscribe();
        this.subscription = null;
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
        return this.ordersSubject.asObservable();
    }
}
