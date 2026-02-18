import { StationRepository } from '../repository/stationRepository.js';
import { StationRefEntity } from '../entity/stationRefEntity.js';

export interface ResolveStationInput {
    ref: StationRefEntity;
    additionalRefs?: StationRefEntity[];
}

export interface ResolveStationUseCase {
    execute(input: ResolveStationInput): Promise<string>;
}

export class ResolveStationUseCaseImpl implements ResolveStationUseCase {
    private repository: StationRepository;

    constructor(repository: StationRepository) {
        this.repository = repository;
    }

    async execute(input: ResolveStationInput): Promise<string> {
        // 1. Look up primary ref
        const stationId = await this.repository.findStationByRef(input.ref);
        if (stationId) return stationId;

        // 2. Check additional refs
        if (input.additionalRefs) {
            for (const altRef of input.additionalRefs) {
                const altStationId = await this.repository.findStationByRef(altRef);
                if (altStationId) {
                    await this.repository.addRef(altStationId, input.ref);
                    return altStationId;
                }
            }
        }

        // 3. Create new station + ref
        const newId = await this.repository.createStationWithRef(input.ref);
        if (input.additionalRefs) {
            for (const altRef of input.additionalRefs) {
                await this.repository.addRef(newId, altRef);
            }
        }
        return newId;
    }
}
