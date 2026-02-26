import { Observable } from 'rxjs';
import { CookMessageModel } from '../../model/cookMessageModel.js';
import { OrderModel } from '../../model/orderModel.js';

export interface QueueSource {
    createCook(id: string, execute: (order: OrderModel, signal?: AbortSignal) => Promise<void>, queueName: string): Promise<void>;
    queueOrder(order: OrderModel, queueName: string): Promise<void>;
    addOrderMessage(orderId: string, message: CookMessageModel, queueName: string): Promise<void>;
    getOrders(queueName: string): Promise<OrderModel[]>;
    deleteOrder(orderId: string, queueName: string): Promise<void>;
    watchAll(queueName: string): Observable<OrderModel[]>;
}
