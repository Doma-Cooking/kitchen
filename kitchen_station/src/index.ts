export type { StationModel } from './data/model/stationModel.js';

export type { StationSource } from './data/source/stationSource.js';
export { PostgresStationSource } from './data/source/postgresStationSource.js';
export { MemoryStationSource } from './data/source/memoryStationSource.js';

export type { StationEntity } from './domain/entity/stationEntity.js';
export { toStationEntity, toStationModel } from './domain/entity/stationEntity.js';

export type { StationRepository } from './domain/repository/stationRepository.js';
export { StationRepositoryImpl } from './domain/repository/stationRepository.js';

export type { GetStationByIdUseCase } from './domain/usecase/getStationByIdUseCase.js';
export { GetStationByIdUseCaseImpl } from './domain/usecase/getStationByIdUseCase.js';
export type { CreateStationUseCase } from './domain/usecase/createStationUseCase.js';
export { CreateStationUseCaseImpl } from './domain/usecase/createStationUseCase.js';
export type { UpdateStationUseCase } from './domain/usecase/updateStationUseCase.js';
export { UpdateStationUseCaseImpl } from './domain/usecase/updateStationUseCase.js';
export type { DeleteStationUseCase } from './domain/usecase/deleteStationUseCase.js';
export { DeleteStationUseCaseImpl } from './domain/usecase/deleteStationUseCase.js';
export type { WatchStationsUseCase } from './domain/usecase/watchStationsUseCase.js';
export { WatchStationsUseCaseImpl } from './domain/usecase/watchStationsUseCase.js';

import { StationDependencies as _StationDependencies } from './di/dependencies.js';
export { StationDependencies } from './di/dependencies.js';

export const stationDependencies = new _StationDependencies();
