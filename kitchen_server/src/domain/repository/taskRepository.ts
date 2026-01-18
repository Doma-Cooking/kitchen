import { map, Observable } from 'rxjs';
import { TaskSource } from '../../data/source/task/taskSource.js';
import { TaskEntity, TaskStatus, toTaskEntity } from '../entity/taskEntity.js';
import { CookStatusMessageEntity, toCookStatusMessageModel } from '../entity/cookMessageEntity.js';

export interface TaskRepository {
    createTask(input: string | null, procedureName: string | null, stationId: string | null): Promise<TaskEntity>;
    getTaskById(taskId: string): Promise<TaskEntity | null>;
    addMessageToTask(taskId: string, message: CookStatusMessageEntity): Promise<void>;
    updateTaskStatus(taskId: string, status: TaskStatus): Promise<void>;
    deleteTask(taskId: string): Promise<void>;
    watchAll(): Observable<TaskEntity[]>;
}

export class TaskRepositoryImpl implements TaskRepository {
    private source: TaskSource;

    constructor(source: TaskSource) {
        this.source = source;
    }

    async createTask(input: string | null, procedureName: string | null, stationId: string | null): Promise<TaskEntity> {
        const model = await this.source.createTask(input, procedureName, stationId);
        return toTaskEntity(model);
    }

    async getTaskById(taskId: string): Promise<TaskEntity | null> {
        const model = await this.source.getTaskById(taskId);
        return model ? toTaskEntity(model) : null;
    }

    async addMessageToTask(taskId: string, message: CookStatusMessageEntity): Promise<void> {
        await this.source.addMessageToTask(taskId, toCookStatusMessageModel(message));
    }

    async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
        await this.source.updateTaskStatus(taskId, status);
    }

    async deleteTask(taskId: string): Promise<void> {
        await this.source.deleteTask(taskId);
    }

    watchAll(): Observable<TaskEntity[]> {
        return this.source.watchAll().pipe(
            map(models => models.map(toTaskEntity))
        );
    }
}