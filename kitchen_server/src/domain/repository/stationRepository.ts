import { BehaviorSubject, map, Observable, Subscription } from "rxjs";
import { StationSource } from "../../data/source/station/stationSource.js";
import { StationEntity, toStationEntity, toStationModel } from "../entity/stationEntity.js";
import { Disposable } from "../../di/disposable.js";

export interface StationRepository extends Disposable {
    createStation(stationId: string): Promise<StationEntity>;
    getStationById(stationId: string): Promise<StationEntity | null>;
    updateStation(station: StationEntity): Promise<void>;
    deleteStation(stationId: string): Promise<void>;
    watchAll(): Observable<StationEntity[]>;
}

export class StationRepositoryImpl implements StationRepository {
    private source: StationSource;
    private stationsSubject = new BehaviorSubject<StationEntity[]>([]);
    private subscription: Subscription | null = null;

    constructor(source: StationSource) {
        this.source = source;
    }

    async initialize(): Promise<void> {
        await Promise.resolve();

        this.subscription = this.source.watchAll().pipe(
            map(models => models.map(toStationEntity))
        ).subscribe({
            next: stations => { this.stationsSubject.next(stations); },
            error: err => { console.error('Station watch error:', err); }
        });
    }

    async dispose(): Promise<void> {
        await Promise.resolve();

        this.subscription?.unsubscribe();
        this.subscription = null;
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
        return this.stationsSubject.asObservable();
    }
}