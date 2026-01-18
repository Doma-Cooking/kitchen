import { Observable } from "rxjs";
import { CookMessageModel } from "../../model/cookMessageModel.js";
import { StationModel } from "../../model/stationModel.js";
import { TaskModel } from "../../model/taskModel.js";
import { CookSource } from "./cookSource.js";

export class MockCookSource implements CookSource {
    executeTask(task: TaskModel, station: StationModel | null): Observable<CookMessageModel> {
        return new Observable(observer => {
            observer.next({
                type: 'status',
                id: '',
                message: `Starting task ${task.id} on station ${station ? station.id : 'null'}`,
                timestamp: new Date().toISOString()
            });

            setTimeout(() => {
                observer.next({
                    type: 'status',
                    id: '',
                    message: `Halfway through task ${task.id}`,
                    timestamp: new Date().toISOString()
                });
            }, 1000);

            setTimeout(() => {
                observer.next({
                    type: 'status',
                    id: '',
                    message: `Completed task ${task.id}`,
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