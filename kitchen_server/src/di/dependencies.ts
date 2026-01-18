import { CookSource } from "../data/source/cook/cookSource.js";
import { MockCookSource } from "../data/source/cook/mockCookSource.js";
import { MemoryDb } from "../data/source/memoryDb.js";
import { MemoryStationSource } from "../data/source/station/memoryStationSource.js";
import { StationSource } from "../data/source/station/stationSource.js";
import { MemoryTaskSource } from "../data/source/task/memoryTaskSource.js";
import { TaskSource } from "../data/source/task/taskSource.js";
import { CookRepository, CookRepositoryImpl } from "../domain/repository/cookRepository.js";
import { StationRepository, StationRepositoryImpl } from "../domain/repository/stationRepository.js";
import { TaskRepository, TaskRepositoryImpl } from "../domain/repository/taskRepository.js";
import { CleanupStationUseCase, CleanupStationUseCaseImpl } from "../domain/usecase/station/cleanupStationUseCase.js";
import { WatchStationsUseCase, WatchStationsUseCaseImpl } from "../domain/usecase/station/watchStationsUseCase.js";
import { QueueTaskUseCase, QueueTaskUseCaseImpl } from "../domain/usecase/task/queueTaskUseCase.js";
import { WatchTasksUseCase, WatchTasksUseCaseImpl } from "../domain/usecase/task/watchTasksUseCase.js";

export class Dependencies {
    memoryDb: MemoryDb;

    stationSource: StationSource;
    taskSource: TaskSource;
    cookSource: CookSource;

    stationRepository: StationRepository;
    taskRepository: TaskRepository;
    cookRepository: CookRepository;

    queueTaskUseCase: QueueTaskUseCase;
    cleanupStationUseCase: CleanupStationUseCase;
    watchStationsUseCase: WatchStationsUseCase;
    watchTasksUseCase: WatchTasksUseCase;

    constructor(
        memoryDb: MemoryDb | null = null,
        stationSource: StationSource | null = null,
        taskSource: TaskSource | null = null,
        cookSource: CookSource | null = null,
        stationRepository: StationRepository | null = null,
        taskRepository: TaskRepository | null = null,
        cookRepository: CookRepository | null = null,
        queueTaskUseCase: QueueTaskUseCase | null = null,
        cleanupStationUseCase: CleanupStationUseCase | null = null,
        watchStationsUseCase: WatchStationsUseCase | null = null,
        watchTasksUseCase: WatchTasksUseCase | null = null
    ) {
        this.memoryDb = memoryDb ?? new MemoryDb();;

        this.stationSource = stationSource ?? new MemoryStationSource(this.memoryDb);
        this.taskSource = taskSource ?? new MemoryTaskSource(this.memoryDb);
        this.cookSource = cookSource ?? new MockCookSource();

        this.stationRepository = stationRepository ?? new StationRepositoryImpl(this.stationSource);
        this.taskRepository = taskRepository ?? new TaskRepositoryImpl(this.taskSource);
        this.cookRepository = cookRepository ?? new CookRepositoryImpl(this.cookSource, this.taskRepository, this.stationRepository);

        this.queueTaskUseCase = queueTaskUseCase ?? new QueueTaskUseCaseImpl(this.taskRepository, this.stationRepository, this.cookRepository);
        this.cleanupStationUseCase = cleanupStationUseCase ?? new CleanupStationUseCaseImpl(this.stationRepository);
        this.watchStationsUseCase = watchStationsUseCase ?? new WatchStationsUseCaseImpl(this.stationRepository);
        this.watchTasksUseCase = watchTasksUseCase ?? new WatchTasksUseCaseImpl(this.taskRepository);
    }
}