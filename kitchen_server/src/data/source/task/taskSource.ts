import { TaskModel } from "../../model/taskModel.js";

export interface TaskSource {
    createTask(input: string | null, procedureName: string | null, stationId: string | null): Promise<void>;
    getTaskById(taskId: string): Promise<TaskModel | null>;
    updateTask(task: TaskModel): Promise<void>;
    deleteTask(taskId: string): Promise<void>;
}