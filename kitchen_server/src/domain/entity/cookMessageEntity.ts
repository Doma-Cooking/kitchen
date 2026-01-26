import { CookMessageModel } from '../../data/model/cookMessageModel.js';

export interface CookMessageEntity {
    message: string;
    timestamp: Date;
}

export function toCookMessageEntity(model: CookMessageModel): CookMessageEntity {
    return {
        message: model.message,
        timestamp: model.timestamp
    };
}

export function toCookMessageModel(entity: CookMessageEntity): CookMessageModel {
    return {
        message: entity.message,
        timestamp: entity.timestamp
    };
}