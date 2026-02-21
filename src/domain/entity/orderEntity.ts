import { OrderModel } from '../../data/model/orderModel.js';

export interface OrderEntity {
    id: string;
    name: string;
    input?: object;
    recipeId: string;
    stationId?: string;
}

export function toOrderEntity(model: OrderModel): OrderEntity {
    return {
        id: model.id,
        name: model.name,
        input: model.input,
        recipeId: model.recipeId,
        stationId: model.stationId
    };
}

export function toOrderModel(entity: OrderEntity): OrderModel {
    return {
        id: entity.id,
        name: entity.name,
        input: entity.input,
        recipeId: entity.recipeId,
        stationId: entity.stationId
    };
}
