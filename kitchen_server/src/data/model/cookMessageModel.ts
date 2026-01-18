import { StationModel } from "./stationModel.js";

export type CookMessageModel = CookStatusMessageModel | CookStationMessageModel;

export interface CookStatusMessageModel {
    type: 'status';
    id: string;
    message: string;
    timestamp: string;
}

export interface CookStationMessageModel {
    type: 'station';
    station: StationModel;
    timestamp: string;
}