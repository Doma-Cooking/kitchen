import { map, Observable } from 'rxjs';
import { StationSource } from '../../data/source/stationSource.js';
import { StationEntity, toStationEntity, toStationModel } from '../entity/stationEntity.js';
import { StationRefEntity, serializeRef } from '../entity/stationRefEntity.js';

export interface StationRepository {
    createStation(stationId: string): Promise<StationEntity>;
    getStationById(stationId: string): Promise<StationEntity | null>;
    updateStation(stationId: string, station: StationEntity): Promise<void>;
    deleteStation(stationId: string): Promise<void>;
    watchAll(): Observable<StationEntity[]>;

    findStationByRef(ref: StationRefEntity): Promise<string | null>;
    createStationWithRef(ref: StationRefEntity): Promise<string>;
    addRef(stationId: string, ref: StationRefEntity): Promise<void>;
    getAllRefs(): Promise<{ ref: string; stationId: string }[]>;
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

    async updateStation(stationId: string, station: StationEntity): Promise<void> {
        await this.source.updateStation(stationId, toStationModel(station));
    }

    async deleteStation(stationId: string): Promise<void> {
        await this.source.deleteStation(stationId);
    }

    watchAll(): Observable<StationEntity[]> {
        return this.source.watchAll().pipe(
            map(models => models.map(toStationEntity))
        );
    }

    async findStationByRef(ref: StationRefEntity): Promise<string | null> {
        return this.source.findStationByRef(serializeRef(ref));
    }

    async createStationWithRef(ref: StationRefEntity): Promise<string> {
        return this.source.createStationWithRef(serializeRef(ref));
    }

    async addRef(stationId: string, ref: StationRefEntity): Promise<void> {
        await this.source.addRef(stationId, serializeRef(ref));
    }

    async getAllRefs(): Promise<{ ref: string; stationId: string }[]> {
        return this.source.getAllRefs();
    }
}
