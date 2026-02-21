import { StationEntity } from '../../entity/stationEntity.js';
import { StationRepository } from '../../repository/stationRepository.js';

export interface CreateStationUseCase {
    execute(stationId: string): Promise<StationEntity>;
}

export class CreateStationUseCaseImpl implements CreateStationUseCase {
    stationRepository: StationRepository;

    constructor(stationRepository: StationRepository) {
        this.stationRepository = stationRepository;
    }

    async execute(stationId: string): Promise<StationEntity> {
        return await this.stationRepository.createStation(stationId);
    }
}
