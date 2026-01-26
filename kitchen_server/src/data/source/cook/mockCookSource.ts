import { Observable } from 'rxjs';
import { CookMessageModel } from '../../model/cookMessageModel.js';
import { CookSource } from './cookSource.js';
import { OrderModel } from '../../model/orderModel.js';

export class MockCookSource implements CookSource {
    executeOrder(order: OrderModel, signal: AbortSignal | undefined): Observable<CookMessageModel> {
        return new Observable(observer => {
            let currentTimeout: NodeJS.Timeout | null = null;

            signal?.addEventListener('abort', () => {
                observer.complete();
                if (currentTimeout) {
                    clearTimeout(currentTimeout);
                }
            });

            observer.next({
                message: `Starting order ${order.id} on station ${order.stationId ?? 'none'}`,
                timestamp: new Date()
            });

            currentTimeout = setTimeout(() => {
                observer.next({
                    message: `Halfway through order ${order.id}`,
                    timestamp: new Date()
                });
            }, 10000);

            currentTimeout = setTimeout(() => {
                observer.next({
                    message: `Completed order ${order.id}`,
                    timestamp: new Date()
                });

                observer.complete();
            }, 20000);
        });
    }
}
