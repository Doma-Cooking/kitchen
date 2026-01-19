import { Observable } from "rxjs";
import { CookMessageModel } from "../../model/cookMessageModel.js";
import { StationModel } from "../../model/stationModel.js";
import { OrderModel } from "../../model/orderModel.js";
import { CookSource } from "./cookSource.js";

export class MockCookSource implements CookSource {
    executeOrder(order: OrderModel, station: StationModel | null): Observable<CookMessageModel> {
        return new Observable(observer => {
            observer.next({
                type: 'status',
                id: `${order.id}-starting`,
                message: `Starting order ${order.id} on station ${station ? station.id : 'null'}`,
                timestamp: new Date().toISOString()
            });

            setTimeout(() => {
                observer.next({
                    type: 'status',
                    id: `${order.id}-halfway`,
                    message: `Halfway through order ${order.id}`,
                    timestamp: new Date().toISOString()
                });
            }, 1000);

            setTimeout(() => {
                observer.next({
                    type: 'status',
                    id: `${order.id}-complete`,
                    message: `Completed order ${order.id}`,
                    timestamp: new Date().toISOString()
                });

                if (station) {
                    const updatedStation = Object.assign(
                        {},
                        station,
                        {
                            contextBytes: new Uint8Array([...station.contextBytes, 1]),
                            updatedAt: new Date().toISOString()
                        }
                    );

                    observer.next({
                        type: 'station',
                        station: updatedStation,
                        timestamp: new Date().toISOString()
                    });
                }

                observer.complete();
            }, 2000);
        });
    }
}
