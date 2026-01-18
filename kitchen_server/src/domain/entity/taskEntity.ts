import { TaskModel } from "../../data/model/taskModel.js";

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
        createdAt: entity.createdAt.toISOString(),
        updatedAt: entity.updatedAt.toISOString(),
    };
}