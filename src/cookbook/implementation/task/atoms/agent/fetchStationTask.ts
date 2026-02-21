import { dependencies } from "../../../../../server.js";
import type { StationEntity } from "../../../../../domain/entity/stationEntity.js";
import { Task } from "../../../../interface/task.js";

export interface FetchStationTaskInput {
    stationId: string;
}

export interface FetchStationTaskOutput {
    stationId: string;
    station?: StationEntity;
}

export const fetchStationTask: Task<FetchStationTaskInput, FetchStationTaskOutput> = {
    async execute(input: FetchStationTaskInput, sendMessage: (message: string) => void): Promise<FetchStationTaskOutput> {
        if (!input.stationId) {
            throw new Error("No station ID provided, station fetch failed");
        }

        const station = await dependencies.getStationByIdUseCase.execute(input.stationId) ?? undefined;
        sendMessage(`Fetched station ${input.stationId}`);
        return { stationId: input.stationId, station: station };
    }
}
