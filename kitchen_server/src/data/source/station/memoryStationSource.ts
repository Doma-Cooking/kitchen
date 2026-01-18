import { StationModel } from "../../model/stationModel.js";
import { StationSource } from "./stationSource.js";

const _memoryDelayMs = 100;

export class MemoryStationSource implements StationSource {
    private stations: Map<string, StationModel> = new Map<string, StationModel>();

    async createStation(stationId: string): Promise<StationModel> {
        await new Promise((resolve) => setTimeout(resolve, _memoryDelayMs));
        const newStation = new StationModel(stationId, new Uint8Array());
        this.stations.set(stationId, newStation);
        return newStation;
    }

    async getStationById(stationId: string): Promise<StationModel | null> {
        await new Promise((resolve) => setTimeout(resolve, _memoryDelayMs));
        return this.stations.get(stationId) ?? null;
    }

    async updateStation(station: StationModel): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, _memoryDelayMs));
        this.stations.set(station.id, station);
    }

    async deleteStation(stationId: string): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, _memoryDelayMs));
        this.stations.delete(stationId);
    }
}