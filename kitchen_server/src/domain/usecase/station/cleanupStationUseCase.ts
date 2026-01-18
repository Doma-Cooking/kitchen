import { StationRepository } from "../../repository/stationRepository.js";

export interface CleanupStationUseCase {
    execute(stationId: string): Promise<void>;
}

export class CleanupStationUseCaseImpl implements CleanupStationUseCase {
    stationRepository: StationRepository;

    constructor(stationRepository: StationRepository) {
        this.stationRepository = stationRepository;
    }

    async execute(stationId: string): Promise<void> {
        await this.stationRepository.deleteStation(stationId);
    }
}