import { dependencies } from "../../../../../server.js";
import type { StationEntity } from "../../../../../domain/entity/stationEntity.js";
import { Task } from "../../../../interface/task.js";

export interface SaveStationTaskInput {
    stationId: string;
    station: StationEntity
}

export type SaveStationTaskOutput = object;

export const saveStationTask: Task<SaveStationTaskInput, SaveStationTaskOutput> = {
    async execute(input: SaveStationTaskInput, sendMessage: (message: string) => void): Promise<SaveStationTaskOutput> {
        if (!input.stationId) {
            throw new Error("No station ID provided, station save failed");
        }

        await dependencies.updateStationUseCase.execute(input.stationId, input.station);
        sendMessage(`Saved station ${input.stationId}`);
        return {};
    }
}
