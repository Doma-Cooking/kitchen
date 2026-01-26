import { StationModel } from 'kitchen_station';

export type CookMessageModel = CookStatusMessageModel | CookStationMessageModel;

export interface CookStatusMessageModel {
    [key: string]: string | Date;
    type: 'status';
    message: string;
    timestamp: Date;
}

export interface CookStationMessageModel {
    type: 'station';
    station: StationModel;
    timestamp: Date;
}