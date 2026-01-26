import { map, Observable } from 'rxjs';
import { StationModel } from '../model/stationModel.js';
import { StationSource } from './stationSource.js';
import { MemoryDb } from 'kitchen_database';

const _memoryDelayMs = 100;

export class MemoryStationSource implements StationSource {
    private db: MemoryDb;

    constructor(db: MemoryDb) {
        this.db = db;
    }

    private parse(json: string): StationModel {
        return JSON.parse(json) as StationModel;
    }

    private stringify(model: StationModel): string {
        return JSON.stringify(model);
    }

    async createStation(stationId: string): Promise<StationModel> {
        await new Promise((resolve) => setTimeout(resolve, _memoryDelayMs));
        const newStation: StationModel = {
            contextBytes: new Uint8Array()
        };
        const updated = new Map(this.db.stations.value);
        updated.set(stationId, this.stringify(newStation));
        this.db.stations.next(updated);
        return newStation;
    }

    async getStationById(stationId: string): Promise<StationModel | null> {
        await new Promise((resolve) => setTimeout(resolve, _memoryDelayMs));
        const json = this.db.stations.value.get(stationId);
        return json ? this.parse(json) : null;
    }

    async updateStation(stationId: string, station: StationModel): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, _memoryDelayMs));
        const updated = new Map(this.db.stations.value);
        updated.set(stationId, this.stringify({ ...station }));
        this.db.stations.next(updated);
    }

    async deleteStation(stationId: string): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, _memoryDelayMs));
        const updated = new Map(this.db.stations.value);
        updated.delete(stationId);
        this.db.stations.next(updated);
    }

    watchAll(): Observable<StationModel[]> {
        return this.db.stations.pipe(
            map(stations => Array.from(stations.values()).map(json => this.parse(json)))
        );
    }
}
