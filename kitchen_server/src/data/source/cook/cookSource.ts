import { Observable } from "rxjs";
import { StationModel } from "../../model/stationModel.js";
import { TaskModel } from "../../model/taskModel.js";
import { CookMessageModel } from "../../model/cookMessageModel.js";

export interface CookSource {
    executeTask(task: TaskModel, station: StationModel | null): Observable<CookMessageModel>;
}