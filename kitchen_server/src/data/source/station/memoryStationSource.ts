import { map, Observable } from 'rxjs';
import { StationModel } from '../../model/stationModel.js';
import { StationSource } from './stationSource.js';
import { MemoryDb } from '../../../db/memory/memoryDb.js';

const _memoryDelayMs = 100;

export class MemoryStationSource implements StationSource {
    private db: MemoryDb;

    constructor(db: MemoryDb) {
        this.db = db;
    }

    async createStation(stationId: string): Promise<StationModel> {
        await new Promise((resolve) => setTimeout(resolve, _memoryDelayMs));
        const newStation = {
            id: stationId,
            contextBytes: new Uint8Array(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        const updatedStations = new Map(this.db.stations.value);
        updatedStations.set(newStation.id, newStation);
        this.db.stations.next(updatedStations);
        return newStation;
    }

    async getStationById(stationId: string): Promise<StationModel | null> {
        await new Promise((resolve) => setTimeout(resolve, _memoryDelayMs));
        return this.db.stations.value.get(stationId) ?? null;
    }

    async updateStation(station: StationModel): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, _memoryDelayMs));
        const updatedStation = Object.assign({}, station, { updatedAt: new Date().toISOString() });
        const updatedStations = new Map(this.db.stations.value);
        updatedStations.set(station.id, updatedStation);
        this.db.stations.next(updatedStations);
    }

    async deleteStation(stationId: string): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, _memoryDelayMs));

        const relevantOrders = Array
            .from(this.db.orders.value.values())
            .filter(order => order.stationId === stationId && (order.status === 'queued' || order.status === 'cooking'));

        if (relevantOrders.length > 0) {
            throw new Error(`Cannot delete station ${stationId} because it has pending/running orders.`);
        }

        const updatedStations = new Map(this.db.stations.value);
        updatedStations.delete(stationId);
        this.db.stations.next(updatedStations);
    }

    watchAll(): Observable<StationModel[]> {
        return this.db.stations.pipe(map(stations => Array.from(stations.values())));
    }
}