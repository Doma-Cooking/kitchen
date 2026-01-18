import { Observable } from "rxjs";
import { TaskEntity } from "../../entity/taskEntity.js";
import { TaskRepository } from "../../repository/taskRepository.js";

export interface WatchTasksUseCase {
    execute(): Observable<TaskEntity[]>;
}

export class WatchTasksUseCaseImpl implements WatchTasksUseCase {
    private taskRepository: TaskRepository;

    constructor(taskRepository: TaskRepository) {
        this.taskRepository = taskRepository;
    }

    execute(): Observable<TaskEntity[]> {
        return this.taskRepository.watchAll();
    }
}
