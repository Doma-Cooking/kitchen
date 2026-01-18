import { TaskSource } from '../../data/source/task/taskSource.js';
import { TaskEntity, toTaskEntity, toTaskModel } from '../entity/taskEntity.js';

export interface TaskRepository {
    createTask(input: string | null, procedureName: string | null, stationId: string | null): Promise<void>;
    getTaskById(taskId: string): Promise<TaskEntity | null>;
    updateTask(task: TaskEntity): Promise<void>;
    deleteTask(taskId: string): Promise<void>;
}

export class TaskRepositoryImpl implements TaskRepository {
    private source: TaskSource;

    constructor(source: TaskSource) {
        this.source = source;
    }

    async createTask(input: string | null, procedureName: string | null, stationId: string | null): Promise<void> {
        await this.source.createTask(input, procedureName, stationId);
    }

    async getTaskById(taskId: string): Promise<TaskEntity | null> {
        const model = await this.source.getTaskById(taskId);
        return model ? toTaskEntity(model) : null;
    }

    async updateTask(task: TaskEntity): Promise<void> {
        await this.source.updateTask(toTaskModel(task));
    }

    async deleteTask(taskId: string): Promise<void> {
        await this.source.deleteTask(taskId);
    }
}