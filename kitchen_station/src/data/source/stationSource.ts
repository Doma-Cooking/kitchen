import { Observable } from 'rxjs';
import { StationModel } from '../model/stationModel.js';

export interface StationSource {
    createStation(stationId: string): Promise<StationModel>;
    getStationById(stationId: string): Promise<StationModel | null>;
    updateStation(stationId: string, station: StationModel): Promise<void>;
    deleteStation(stationId: string): Promise<void>;
    watchAll(): Observable<StationModel[]>;

    findStationByRef(ref: string): Promise<string | null>;
    createStationWithRef(ref: string): Promise<string>;
    addRef(stationId: string, ref: string): Promise<void>;
    getAllRefs(): Promise<{ ref: string; stationId: string }[]>;
}
