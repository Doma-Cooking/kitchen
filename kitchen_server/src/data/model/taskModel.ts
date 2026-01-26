import { OrderModel } from './orderModel.js';
import { StationModel } from 'kitchen_station';

export interface TaskModel {
    order: OrderModel,
    station: StationModel | null
};