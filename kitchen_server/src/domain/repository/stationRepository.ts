import { map, Observable } from "rxjs";
import { StationSource } from "../../data/source/station/stationSource.js";
import { StationEntity, toStationEntity, toStationModel } from "../entity/stationEntity.js";

export interface StationRepository {
    createStation(stationId: string): Promise<StationEntity>;
    getStationById(stationId: string): Promise<StationEntity | null>;
    updateStation(station: StationEntity): Promise<void>;
    deleteStation(stationId: string): Promise<void>;
    watchAll(): Observable<StationEntity[]>;
}

export class StationRepositoryImpl implements StationRepository {
    private source: StationSource;

    constructor(source: StationSource) {
        this.source = source;
    }

    async createStation(stationId: string): Promise<StationEntity> {
        const model = await this.source.createStation(stationId);
        return toStationEntity(model);
    }

    async getStationById(stationId: string): Promise<StationEntity | null> {
        const model = await this.source.getStationById(stationId);
        return model ? toStationEntity(model) : null;
    }

    async updateStation(station: StationEntity): Promise<void> {
        await this.source.updateStation(toStationModel(station));
    }

    async deleteStation(stationId: string): Promise<void> {
        await this.source.deleteStation(stationId);
    }

    watchAll(): Observable<StationEntity[]> {
        return this.source.watchAll().pipe(
            map(models => models.map(toStationEntity))
        );
    }
}