import { concatMap, lastValueFrom, map } from "rxjs";
import { StationEntity, toStationModel } from "../entity/stationEntity.js";
import { TaskEntity, TaskStatus, toTaskModel } from "../entity/taskEntity.js";
import { toCookMessageEntity } from "../entity/cookMessageEntity.js";
import { CookSource } from "../../data/source/cook/cookSource.js";
import { StationRepository } from "./stationRepository.js";
import { TaskRepository } from "./taskRepository.js";

export interface CookRepository {
    executeTask(task: TaskEntity, station: StationEntity | null): Promise<void>;
}

export class CookRepositoryImpl implements CookRepository {
    private source: CookSource;
    private taskRepository: TaskRepository;
    private stationRepository: StationRepository;

    constructor(
        source: CookSource,
        taskRepository: TaskRepository,
        stationRepository: StationRepository
    ) {
        this.source = source;
        this.taskRepository = taskRepository;
        this.stationRepository = stationRepository;
    }

    async executeTask(task: TaskEntity, station: StationEntity | null): Promise<void> {
        await this.taskRepository.updateTaskStatus(task.id, TaskStatus.InProgress);

        try {
            await lastValueFrom(
                this.source.executeTask(
                    toTaskModel(task),
                    station ? toStationModel(station) : null,
                ).pipe(
                    map(model => toCookMessageEntity(model)),
                    concatMap((message) => {
                        switch (message.type) {
                            case 'status':
                                return this.taskRepository.addMessageToTask(task.id, message);
                            case 'station':
                                return this.stationRepository.updateStation(message.station);
                        }
                    }),
                )
            );
            await this.taskRepository.updateTaskStatus(task.id, TaskStatus.Completed);
        } catch (err) {
            await this.taskRepository.updateTaskStatus(task.id, TaskStatus.Failed);
            throw err;
        }
    }
}