import { StationEntity } from '../entity/stationEntity.js';
import { StationRepository } from '../repository/stationRepository.js';

export interface GetStationByIdUseCase {
    execute(stationId: string): Promise<StationEntity | null>;
}

export class GetStationByIdUseCaseImpl implements GetStationByIdUseCase {
    stationRepository: StationRepository;

    constructor(stationRepository: StationRepository) {
        this.stationRepository = stationRepository;
    }

    async execute(stationId: string): Promise<StationEntity | null> {
        return await this.stationRepository.getStationById(stationId);
    }
}
