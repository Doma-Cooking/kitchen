import { StationRepository } from '../../repository/stationRepository.js';

export interface DeleteStationUseCase {
    execute(stationId: string): Promise<void>;
}

export class DeleteStationUseCaseImpl implements DeleteStationUseCase {
    stationRepository: StationRepository;

    constructor(stationRepository: StationRepository) {
        this.stationRepository = stationRepository;
    }

    async execute(stationId: string): Promise<void> {
        await this.stationRepository.deleteStation(stationId);
    }
}
