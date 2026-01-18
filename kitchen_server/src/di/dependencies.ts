import { MemoryDb } from "../data/source/memoryDb.js";
import { MemoryStationSource } from "../data/source/station/memoryStationSource.js";
import { StationSource } from "../data/source/station/stationSource.js";
import { MemoryTaskSource } from "../data/source/task/memoryTaskSource.js";
import { TaskSource } from "../data/source/task/taskSource.js";
import { StationRepository, StationRepositoryImpl } from "../domain/repository/stationRepository.js";
import { TaskRepository, TaskRepositoryImpl } from "../domain/repository/taskRepository.js";
import { CleanupStationUseCase, CleanupStationUseCaseImpl } from "../domain/usecase/station/cleanupStationUseCase.js";
import { WatchStationsUseCase, WatchStationsUseCaseImpl } from "../domain/usecase/station/watchStationsUseCase.js";
import { RunTaskUseCase, RunTaskUseCaseImpl } from "../domain/usecase/task/runTaskUseCase.js";
import { WatchTasksUseCase, WatchTasksUseCaseImpl } from "../domain/usecase/task/watchTasksUseCase.js";

export class Dependencies {
    memoryDb: MemoryDb;

    stationSource: StationSource;
    taskSource: TaskSource;

    stationRepository: StationRepository;
    taskRepository: TaskRepository;

    runTaskUseCase: RunTaskUseCase;
    cleanupStationUseCase: CleanupStationUseCase;
    watchStationsUseCase: WatchStationsUseCase;
    watchTasksUseCase: WatchTasksUseCase;

    constructor(
        memoryDb: MemoryDb | null = null,
        stationSource: StationSource | null = null,
        taskSource: TaskSource | null = null,
        stationRepository: StationRepository | null = null,
        taskRepository: TaskRepository | null = null,
        runTaskUseCase: RunTaskUseCase | null = null,
        cleanupStationUseCase: CleanupStationUseCase | null = null,
        watchStationsUseCase: WatchStationsUseCase | null = null,
        watchTasksUseCase: WatchTasksUseCase | null = null
    ) {
        this.memoryDb = memoryDb ?? new MemoryDb();;

        this.stationSource = stationSource ?? new MemoryStationSource(this.memoryDb);
        this.taskSource = taskSource ?? new MemoryTaskSource(this.memoryDb);

        this.stationRepository = stationRepository ?? new StationRepositoryImpl(this.stationSource);
        this.taskRepository = taskRepository ?? new TaskRepositoryImpl(this.taskSource);

        this.runTaskUseCase = runTaskUseCase ?? new RunTaskUseCaseImpl(this.taskRepository, this.stationRepository);
        this.cleanupStationUseCase = cleanupStationUseCase ?? new CleanupStationUseCaseImpl(this.stationRepository);
        this.watchStationsUseCase = watchStationsUseCase ?? new WatchStationsUseCaseImpl(this.stationRepository);
        this.watchTasksUseCase = watchTasksUseCase ?? new WatchTasksUseCaseImpl(this.taskRepository);
    }
}