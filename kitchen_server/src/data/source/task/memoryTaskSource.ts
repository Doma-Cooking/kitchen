import { TaskModel } from "../../model/taskModel.js";
import { TaskSource } from "./taskSource.js";

const _memoryDelayMs = 100;

export class MemoryTaskSource implements TaskSource {
    private tasks: Map<string, TaskModel> = new Map<string, TaskModel>();

    async createTask(input: string | null, procedureName: string | null, stationId: string | null): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, _memoryDelayMs));
        const newId = `task-${this.tasks.size.toString()}`;
        const task: TaskModel = {
            id: newId,
            input,
            procedureName,
            stationId,
            status: 'Pending',
        };
        this.tasks.set(task.id, task);
    }

    async getTaskById(taskId: string): Promise<TaskModel | null> {
        await new Promise((resolve) => setTimeout(resolve, _memoryDelayMs));
        return this.tasks.get(taskId) ?? null;
    }

    async updateTask(task: TaskModel): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, _memoryDelayMs));
        this.tasks.set(task.id, task);
    }

    async deleteTask(taskId: string): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, _memoryDelayMs));
        this.tasks.delete(taskId);
    }
}