import { StationModel } from '../../data/model/stationModel.js';

export interface StationEntity {
    contextBytes: Uint8Array;
}

export function toStationEntity(model: StationModel): StationEntity {
    return {
        contextBytes: model.contextBytes
    };
}

export function toStationModel(entity: StationEntity): StationModel {
    return {
        contextBytes: entity.contextBytes
    };
}
