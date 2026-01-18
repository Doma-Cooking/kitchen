import { StationModel } from "../../data/model/stationModel.js";

export interface StationEntity {
    id: string;
    contextBytes: Uint8Array;
}

export function toStationEntity(model: StationModel): StationEntity {
    return {
        id: model.id,
        contextBytes: model.contextBytes,
    };
}

export function toStationModel(entity: StationEntity): StationModel {
    return new StationModel(entity.id, entity.contextBytes);
}