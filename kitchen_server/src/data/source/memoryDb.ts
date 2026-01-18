import { BehaviorSubject } from "rxjs";
import { StationModel } from "../model/stationModel.js";
import { TaskModel } from "../model/taskModel.js";

export class MemoryDb {
    stations: BehaviorSubject<Map<string, StationModel>> = new BehaviorSubject<Map<string, StationModel>>(new Map());
    tasks: BehaviorSubject<Map<string, TaskModel>> = new BehaviorSubject<Map<string, TaskModel>>(new Map());
}