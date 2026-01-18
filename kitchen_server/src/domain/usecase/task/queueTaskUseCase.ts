import { CookRepository } from "../../repository/cookRepository.js";
import { StationRepository } from "../../repository/stationRepository.js";
import { TaskRepository } from "../../repository/taskRepository.js";

export interface QueueTaskUseCase {
    execute(input: string | null, procedureName: string | null, stationId: string | null): Promise<void>;
}

export class QueueTaskUseCaseImpl implements QueueTaskUseCase {
    taskRepository: TaskRepository;
    stationRepository: StationRepository;
    cookRepository: CookRepository;

    constructor(
        taskRepository: TaskRepository,
        stationRepository: StationRepository,
        cookRepository: CookRepository
    ) {
        this.taskRepository = taskRepository;
        this.stationRepository = stationRepository;
        this.cookRepository = cookRepository;
    }

    async execute(input: string | null, procedureName: string | null, stationId: string | null): Promise<void> {
        const task = await this.taskRepository.createTask(input, procedureName, stationId);
        const station = stationId ? await this.stationRepository.getStationById(stationId) ?? await this.stationRepository.createStation(stationId) : null;

        // TODO: Rather than executing immediately, add to a queue system.
        await this.cookRepository.executeTask(task, station);
    }
}