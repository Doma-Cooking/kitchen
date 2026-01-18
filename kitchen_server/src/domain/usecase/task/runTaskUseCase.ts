import { StationRepository } from "../../repository/stationRepository.js";
import { TaskRepository } from "../../repository/taskRepository.js";

export interface RunTaskUseCase {
    execute(input: string | null, procedureName: string | null, stationId: string | null): Promise<void>;
}

export class RunTaskUseCaseImpl implements RunTaskUseCase {
    taskRepository: TaskRepository;
    stationRepository: StationRepository;

    constructor(taskRepository: TaskRepository, stationRepository: StationRepository) {
        this.taskRepository = taskRepository;
        this.stationRepository = stationRepository;
    }

    async execute(input: string | null, procedureName: string | null, stationId: string | null): Promise<void> {
        await this.taskRepository.createTask(input, procedureName, stationId);

        const station = stationId ? await this.stationRepository.getStationById(stationId) ?? await this.stationRepository.createStation(stationId) : null;

        console.log(`station: ${JSON.stringify(station)}`);
    }
}