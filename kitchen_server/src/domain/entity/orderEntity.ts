import { OrderModel, OrderStatusModel } from '../../data/model/orderModel.js';
import { CookStatusMessageEntity, toCookStatusMessageEntity, toCookStatusMessageModel } from './cookMessageEntity.js';

export type OrderStatusEntity = 'queued' | 'cooking' | 'succeeded' | 'failed' | 'unknown';

export interface OrderEntity {
    id: string;
    name: string;
    input: string | null;
    recipeId: string | null;
    stationId: string | null;
    status: OrderStatusEntity;
    messages: CookStatusMessageEntity[];
    updatedAt: Date;
}

export function toOrderEntity(model: OrderModel): OrderEntity {
    return {
        id: model.id,
        name: model.name,
        input: model.input,
        recipeId: model.recipeId,
        stationId: model.stationId,
        status: toOrderStatusEntity(model.status),
        messages: model.messages.map(toCookStatusMessageEntity),
        updatedAt: new Date(model.updatedAt),
    };
}

export function toOrderModel(entity: OrderEntity): OrderModel {
    return {
        id: entity.id,
        name: entity.name,
        input: entity.input,
        recipeId: entity.recipeId,
        stationId: entity.stationId,
        status: toOrderStatusModel(entity.status),
        messages: entity.messages.map(toCookStatusMessageModel),
        updatedAt: entity.updatedAt,
    };
}

export function toOrderStatusEntity(model: OrderStatusModel): OrderStatusEntity {
    return model;
}

export function toOrderStatusModel(entity: OrderStatusEntity): OrderStatusModel {
    return entity;
}
