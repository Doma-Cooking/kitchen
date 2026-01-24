import { StationModel } from '../../data/model/stationModel.js';

export interface StationEntity {
    id: string;
    contextBytes: Uint8Array;
    createdAt: Date;
    updatedAt: Date;
}

export function toStationEntity(model: StationModel): StationEntity {
    return {
        id: model.id,
        contextBytes: model.contextBytes,
        createdAt: new Date(model.createdAt),
        updatedAt: new Date(model.updatedAt)
    };
}

export function toStationModel(entity: StationEntity): StationModel {
    return {
        id: entity.id,
        contextBytes: entity.contextBytes,
        createdAt: entity.createdAt.toISOString(),
        updatedAt: entity.updatedAt.toISOString()
    };
}