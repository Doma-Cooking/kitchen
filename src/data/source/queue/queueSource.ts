import { Observable } from 'rxjs';
import { CookMessageModel } from '../../model/cookMessageModel.js';
import { OrderModel } from '../../model/orderModel.js';

export interface QueueSource {
    createCook(id: string, execute: (order: OrderModel, signal?: AbortSignal) => Promise<void>): Promise<void>;
    queueOrder(order: OrderModel): Promise<void>;
    addOrderMessage(orderId: string, message: CookMessageModel): Promise<void>;
    getOrders(): Promise<OrderModel[]>;
    deleteOrder(orderId: string): Promise<void>;
    watchAll(): Observable<OrderModel[]>;
}
