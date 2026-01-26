import { Observable } from 'rxjs';
import { StationEntity } from '../entity/stationEntity.js';
import { StationRepository } from '../repository/stationRepository.js';

export interface WatchStationsUseCase {
    execute(): Observable<StationEntity[]>;
}

export class WatchStationsUseCaseImpl implements WatchStationsUseCase {
    private stationRepository: StationRepository;

    constructor(stationRepository: StationRepository) {
        this.stationRepository = stationRepository;
    }

    execute(): Observable<StationEntity[]> {
        return this.stationRepository.watchAll();
    }
}
