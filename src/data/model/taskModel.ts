import { OrderModel } from './orderModel.js';
import { StationModel } from './stationModel.js';

export interface TaskModel {
    order: OrderModel,
    station?: StationModel
};