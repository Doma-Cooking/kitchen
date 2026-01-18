import { map, Observable } from "rxjs";
import { TaskModel } from "../../model/taskModel.js";
import { TaskSource } from "./taskSource.js";
import { MemoryDb } from "../memoryDb.js";
import { CookStatusMessageModel } from "../../model/cookMessageModel.js";

const _memoryDelayMs = 100;

export class MemoryTaskSource implements TaskSource {
    private db: MemoryDb;
    private nextId = 0;

    constructor(db: MemoryDb) {
        this.db = db;
    }

    async createTask(input: string | null, procedureName: string | null, stationId: string | null): Promise<TaskModel> {
        await new Promise((resolve) => setTimeout(resolve, _memoryDelayMs));
        const task: TaskModel = {
            id: `task-${String(this.nextId++)}`,
            input,
            procedureName,
            stationId,
            status: 'Pending',
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        const updatedTasks = new Map(this.db.tasks.value);
        updatedTasks.set(task.id, task);
        this.db.tasks.next(updatedTasks);
        return task;
    }

    async getTaskById(taskId: string): Promise<TaskModel | null> {
        await new Promise((resolve) => setTimeout(resolve, _memoryDelayMs));
        return this.db.tasks.value.get(taskId) ?? null;
    }

    async addMessageToTask(taskId: string, message: CookStatusMessageModel): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, _memoryDelayMs));
        const task = this.db.tasks.value.get(taskId);
        if (!task) {
            throw new Error(`Task with ID ${taskId} not found`);
        }
        const updatedTask = Object.assign({}, task, { messages: [...task.messages, message], updatedAt: new Date().toISOString() });
        const updatedTasks = new Map(this.db.tasks.value);
        updatedTasks.set(task.id, updatedTask);
        this.db.tasks.next(updatedTasks);
    }

    async updateTaskStatus(taskId: string, status: string): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, _memoryDelayMs));
        const task = this.db.tasks.value.get(taskId);
        if (!task) {
            throw new Error(`Task with ID ${taskId} not found`);
        }
        const updatedTask = Object.assign({}, task, { status, updatedAt: new Date().toISOString() });
        const updatedTasks = new Map(this.db.tasks.value);
        updatedTasks.set(task.id, updatedTask);
        this.db.tasks.next(updatedTasks);
    }

    async deleteTask(taskId: string): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, _memoryDelayMs));
        const updatedTasks = new Map(this.db.tasks.value);
        updatedTasks.delete(taskId);
        this.db.tasks.next(updatedTasks);
    }

    watchAll(): Observable<TaskModel[]> {
        return this.db.tasks.pipe(map(tasks => Array.from(tasks.values())));
    }
}