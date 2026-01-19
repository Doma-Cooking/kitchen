import { BehaviorSubject } from "rxjs";
import { StationModel } from "../model/stationModel.js";
import { OrderModel } from "../model/orderModel.js";

export class MemoryDb {
    stations: BehaviorSubject<Map<string, StationModel>> = new BehaviorSubject<Map<string, StationModel>>(new Map());
    orders: BehaviorSubject<Map<string, OrderModel>> = new BehaviorSubject<Map<string, OrderModel>>(new Map());
}
