import { CookMessageModel, CookStationMessageModel, CookStatusMessageModel } from "../../data/model/cookMessageModel.js";
import { StationEntity, toStationEntity, toStationModel } from "./stationEntity.js";

export type CookMessageEntity = CookStatusMessageEntity | CookStationMessageEntity;

export interface CookStatusMessageEntity {
    type: 'status';
    id: string;
    message: string;
    timestamp: string;
}

export interface CookStationMessageEntity {
    type: 'station';
    station: StationEntity;
    timestamp: string;
}

export function toCookMessageEntity(model: CookMessageModel): CookMessageEntity {
    switch (model.type) {
        case 'status':
            return toCookStatusMessageEntity(model);
        case 'station':
            return toCookStationMessageEntity(model);
    }
}

export function toCookMessageModel(entity: CookMessageEntity): CookMessageModel {
    switch (entity.type) {
        case 'status':
            return toCookStatusMessageModel(entity);
        case 'station':
            return toCookStationMessageModel(entity);
    }
}

export function toCookStatusMessageEntity(model: CookStatusMessageModel): CookStatusMessageEntity {
    return {
        type: 'status',
        id: model.id,
        message: model.message,
        timestamp: model.timestamp
    };
}

export function toCookStatusMessageModel(entity: CookStatusMessageEntity): CookStatusMessageModel {
    return {
        type: 'status',
        id: entity.id,
        message: entity.message,
        timestamp: entity.timestamp
    };
}

export function toCookStationMessageEntity(model: CookStationMessageModel): CookStationMessageEntity {
    return {
        type: 'station',
        station: toStationEntity(model.station),
        timestamp: model.timestamp
    };
}

export function toCookStationMessageModel(entity: CookStationMessageEntity): CookStationMessageModel {
    return {
        type: 'station',
        station: toStationModel(entity.station),
        timestamp: entity.timestamp
    };
}