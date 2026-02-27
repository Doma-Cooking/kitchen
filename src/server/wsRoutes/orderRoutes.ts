import { WebSocket } from 'ws';
import { dependencies } from "../../server.js";
import { createMessage } from '../wsServer.js';
import { OrderEntity } from '../../domain/entity/orderEntity.js';

export function watchOrders(ws: WebSocket): void {
    const subscription = dependencies.watchOrdersUseCase.execute(dependencies.config.orderQueue.name).subscribe({
        next: (orders: OrderEntity[]) => {
            ws.send(createMessage('data', orders));
        },
        error: (err: Error) => {
            ws.send(createMessage('error', err.message));
        }
    });

    ws.on('close', () => {
        subscription.unsubscribe();
    });

    ws.on('error', () => {
        subscription.unsubscribe();
    });
}