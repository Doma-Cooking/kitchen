import { StationEntity } from '../../entity/stationEntity.js';
import { StationRepository } from '../../repository/stationRepository.js';

export interface UpdateStationUseCase {
    execute(stationId: string, station: StationEntity): Promise<void>;
}

export class UpdateStationUseCaseImpl implements UpdateStationUseCase {
    stationRepository: StationRepository;

    constructor(stationRepository: StationRepository) {
        this.stationRepository = stationRepository;
    }

    async execute(stationId: string, station: StationEntity): Promise<void> {
        await this.stationRepository.updateStation(stationId, station);
    }
}
