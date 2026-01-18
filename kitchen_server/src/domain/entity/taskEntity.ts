import { TaskModel } from "../../data/model/taskModel.js";
import { CookStatusMessageEntity, toCookStatusMessageEntity, toCookStatusMessageModel } from "./cookMessageEntity.js";

export enum TaskStatus {
    Pending = 'pending',
    InProgress = 'in_progress',
    Completed = 'completed',
    Failed = 'failed'
}

export interface TaskEntity {
    id: string;
    input: string | null;
    procedureName: string | null;
    stationId: string | null;
    status: TaskStatus;
    messages: CookStatusMessageEntity[];
    createdAt: Date;
    updatedAt: Date;
}

export function toTaskEntity(model: TaskModel): TaskEntity {
    return {
        id: model.id,
        input: model.input,
        procedureName: model.procedureName,
        stationId: model.stationId,
        status: model.status as TaskStatus,
        messages: model.messages.map(toCookStatusMessageEntity),
        createdAt: new Date(model.createdAt),
        updatedAt: new Date(model.updatedAt),
    };
}

export function toTaskModel(entity: TaskEntity): TaskModel {
    return {
        id: entity.id,
        input: entity.input,
        procedureName: entity.procedureName,
        stationId: entity.stationId,
        status: entity.status,
        messages: entity.messages.map(toCookStatusMessageModel),
        createdAt: entity.createdAt.toISOString(),
        updatedAt: entity.updatedAt.toISOString(),
    };
}