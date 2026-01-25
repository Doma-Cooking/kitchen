import { Observable } from 'rxjs';
import { CookMessageModel } from '../../model/cookMessageModel.js';
import { CookSource } from './cookSource.js';
import { TaskModel } from '../../model/taskModel.js';

export class MockCookSource implements CookSource {
    executeOrder(task: TaskModel, signal: AbortSignal | undefined): Observable<CookMessageModel> {
        return new Observable(observer => {
            let currentTimeout: NodeJS.Timeout | null = null;

            signal?.addEventListener('abort', () => {
                observer.complete();
                if (currentTimeout) {
                    clearTimeout(currentTimeout);
                }
            });

            observer.next({
                type: 'status',
                id: `${task.order.id}-starting`,
                message: `Starting order ${task.order.id} on station ${task.station?.id ?? 'none'}`,
                timestamp: new Date()
            });

            currentTimeout = setTimeout(() => {
                observer.next({
                    type: 'status',
                    id: `${task.order.id}-halfway`,
                    message: `Halfway through order ${task.order.id}`,
                    timestamp: new Date()
                });
            }, 10000);

            currentTimeout = setTimeout(() => {
                observer.next({
                    type: 'status',
                    id: `${task.order.id}-complete`,
                    message: `Completed order ${task.order.id}`,
                    timestamp: new Date()
                });

                if (task.station) {
                    const updatedStation = Object.assign(
                        {},
                        task.station,
                        {
                            contextBytes: new Uint8Array([...task.station.contextBytes, 1]),
                            updatedAt: new Date()
                        }
                    );

                    observer.next({
                        type: 'station',
                        station: updatedStation,
                        timestamp: new Date()
                    });
                }

                observer.complete();
            }, 20000);
        });
    }
}
