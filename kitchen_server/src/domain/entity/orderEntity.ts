import { OrderModel } from "../../data/model/orderModel.js";
import { CookStatusMessageEntity, toCookStatusMessageEntity, toCookStatusMessageModel } from "./cookMessageEntity.js";

export enum OrderStatus {
    Pending = 'pending',
    InProgress = 'in_progress',
    Completed = 'completed',
    Failed = 'failed'
}

export interface OrderEntity {
    id: string;
    input: string | null;
    procedureName: string | null;
    stationId: string | null;
    status: OrderStatus;
    messages: CookStatusMessageEntity[];
    createdAt: Date;
    updatedAt: Date;
}

export function toOrderEntity(model: OrderModel): OrderEntity {
    return {
        id: model.id,
        input: model.input,
        procedureName: model.procedureName,
        stationId: model.stationId,
        status: model.status as OrderStatus,
        messages: model.messages.map(toCookStatusMessageEntity),
        createdAt: new Date(model.createdAt),
        updatedAt: new Date(model.updatedAt),
    };
}

export function toOrderModel(entity: OrderEntity): OrderModel {
    return {
        id: entity.id,
        input: entity.input,
        procedureName: entity.procedureName,
        stationId: entity.stationId,
        status: entity.status,
        messages: entity.messages.map(toCookStatusMessageModel),
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
    };
}
