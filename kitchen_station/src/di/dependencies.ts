import { StationSource } from '../data/source/stationSource.js';
import { PostgresStationSource } from '../data/source/postgresStationSource.js';
import { StationRepository, StationRepositoryImpl } from '../domain/repository/stationRepository.js';
import { GetStationByIdUseCase, GetStationByIdUseCaseImpl } from '../domain/usecase/getStationByIdUseCase.js';
import { CreateStationUseCase, CreateStationUseCaseImpl } from '../domain/usecase/createStationUseCase.js';
import { UpdateStationUseCase, UpdateStationUseCaseImpl } from '../domain/usecase/updateStationUseCase.js';
import { DeleteStationUseCase, DeleteStationUseCaseImpl } from '../domain/usecase/deleteStationUseCase.js';
import { WatchStationsUseCase, WatchStationsUseCaseImpl } from '../domain/usecase/watchStationsUseCase.js';
import { ResolveStationUseCase, ResolveStationUseCaseImpl } from '../domain/usecase/resolveStationUseCase.js';
import { ClassifyTriggerUseCase, ClassifyTriggerUseCaseImpl } from '../domain/usecase/classifyTriggerUseCase.js';
import { databaseDependencies } from 'kitchen_database';

export class StationDependencies {
    stationSource: StationSource;

    stationRepository: StationRepository;

    getStationByIdUseCase: GetStationByIdUseCase;
    createStationUseCase: CreateStationUseCase;
    updateStationUseCase: UpdateStationUseCase;
    deleteStationUseCase: DeleteStationUseCase;
    watchStationsUseCase: WatchStationsUseCase;
    resolveStationUseCase: ResolveStationUseCase;
    classifyTriggerUseCase: ClassifyTriggerUseCase;

    constructor(
        stationSource?: StationSource,
        stationRepository?: StationRepository,
        getStationByIdUseCase?: GetStationByIdUseCase,
        createStationUseCase?: CreateStationUseCase,
        updateStationUseCase?: UpdateStationUseCase,
        deleteStationUseCase?: DeleteStationUseCase,
        watchStationsUseCase?: WatchStationsUseCase,
        resolveStationUseCase?: ResolveStationUseCase,
        classifyTriggerUseCase?: ClassifyTriggerUseCase,
    ) {
        this.stationSource = stationSource ?? new PostgresStationSource(databaseDependencies.postgresDb);

        this.stationRepository = stationRepository ?? new StationRepositoryImpl(this.stationSource);

        this.getStationByIdUseCase = getStationByIdUseCase ?? new GetStationByIdUseCaseImpl(this.stationRepository);
        this.createStationUseCase = createStationUseCase ?? new CreateStationUseCaseImpl(this.stationRepository);
        this.updateStationUseCase = updateStationUseCase ?? new UpdateStationUseCaseImpl(this.stationRepository);
        this.deleteStationUseCase = deleteStationUseCase ?? new DeleteStationUseCaseImpl(this.stationRepository);
        this.watchStationsUseCase = watchStationsUseCase ?? new WatchStationsUseCaseImpl(this.stationRepository);
        this.resolveStationUseCase = resolveStationUseCase ?? new ResolveStationUseCaseImpl(this.stationRepository);
        this.classifyTriggerUseCase = classifyTriggerUseCase ?? new ClassifyTriggerUseCaseImpl(this.stationRepository, this.resolveStationUseCase);
    }
}
