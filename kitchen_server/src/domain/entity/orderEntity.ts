import { OrderModel } from '../../data/model/orderModel.js';

export interface OrderEntity {
    id: string;
    name: string;
    input: string | null;
    recipeId: string | null;
    stationId: string | null;
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
