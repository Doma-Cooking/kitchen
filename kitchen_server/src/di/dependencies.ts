import { MemoryStationSource } from "../data/source/station/memoryStationSource.js";
import { StationSource } from "../data/source/station/stationSource.js";
import { MemoryTaskSource } from "../data/source/task/memoryTaskSource.js";
import { TaskSource } from "../data/source/task/taskSource.js";
import { StationRepository, StationRepositoryImpl } from "../domain/repository/stationRepository.js";
import { TaskRepository, TaskRepositoryImpl } from "../domain/repository/taskRepository.js";
import { CleanupStationUseCase, CleanupStationUseCaseImpl } from "../domain/usecase/station/cleanupStationUseCase.js";
import { RunTaskUseCase, RunTaskUseCaseImpl } from "../domain/usecase/task/runTaskUseCase.js";

export class Dependencies {
    stationSource: StationSource;
    taskSource: TaskSource;

    stationRepository: StationRepository;
    taskRepository: TaskRepository;

    runTaskUseCase: RunTaskUseCase;
    cleanupStationUseCase: CleanupStationUseCase;

    constructor(
        stationSource: StationSource | null = null,
        taskSource: TaskSource | null = null,
        stationRepository: StationRepository | null = null,
        taskRepository: TaskRepository | null = null,
        runTaskUseCase: RunTaskUseCase | null = null,
        cleanupStationUseCase: CleanupStationUseCase | null = null
    ) {
        this.stationSource = stationSource ?? new MemoryStationSource();
        this.taskSource = taskSource ?? new MemoryTaskSource();

        this.stationRepository = stationRepository ?? new StationRepositoryImpl(this.stationSource);
        this.taskRepository = taskRepository ?? new TaskRepositoryImpl(this.taskSource);

        this.runTaskUseCase = runTaskUseCase ?? new RunTaskUseCaseImpl(this.taskRepository, this.stationRepository);
        this.cleanupStationUseCase = cleanupStationUseCase ?? new CleanupStationUseCaseImpl(this.stationRepository);
    }
}