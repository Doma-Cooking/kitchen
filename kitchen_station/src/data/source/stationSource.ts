import { Observable } from 'rxjs';
import { StationModel } from '../model/stationModel.js';

export interface StationSource {
    createStation(stationId: string): Promise<StationModel>;
    getStationById(stationId: string): Promise<StationModel | null>;
    updateStation(stationId: string, station: StationModel): Promise<void>;
    deleteStation(stationId: string): Promise<void>;
    watchAll(): Observable<StationModel[]>;
}
