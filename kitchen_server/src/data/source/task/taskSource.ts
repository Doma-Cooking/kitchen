import { Observable } from "rxjs";
import { TaskModel } from "../../model/taskModel.js";
import { CookStatusMessageModel } from "../../model/cookMessageModel.js";

export interface TaskSource {
    createTask(input: string | null, procedureName: string | null, stationId: string | null): Promise<TaskModel>;
    getTaskById(taskId: string): Promise<TaskModel | null>;
    addMessageToTask(taskId: string, message: CookStatusMessageModel): Promise<void>;
    updateTaskStatus(taskId: string, status: string): Promise<void>;
    deleteTask(taskId: string): Promise<void>;
    watchAll(): Observable<TaskModel[]>;
}