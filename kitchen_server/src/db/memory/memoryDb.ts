import { BehaviorSubject } from "rxjs";
import { StationModel } from "../../data/model/stationModel.js";
import { OrderModel } from "../../data/model/orderModel.js";

export class MemoryDb {
    stations: BehaviorSubject<Map<string, StationModel>> = new BehaviorSubject<Map<string, StationModel>>(new Map());
    orders: BehaviorSubject<Map<string, OrderModel>> = new BehaviorSubject<Map<string, OrderModel>>(new Map());
}
