import { CookMessageModel, CookStationMessageModel, CookStatusMessageModel } from '../../data/model/cookMessageModel.js';
import { StationEntity, toStationEntity, toStationModel } from 'kitchen_station';

export type CookMessageEntity = CookStatusMessageEntity | CookStationMessageEntity;

export interface CookStatusMessageEntity {
    type: 'status';
    message: string;
    timestamp: Date;
}

export interface CookStationMessageEntity {
    type: 'station';
    station: StationEntity;
    timestamp: Date;
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
        message: model.message,
        timestamp: model.timestamp
    };
}

export function toCookStatusMessageModel(entity: CookStatusMessageEntity): CookStatusMessageModel {
    return {
        type: 'status',
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