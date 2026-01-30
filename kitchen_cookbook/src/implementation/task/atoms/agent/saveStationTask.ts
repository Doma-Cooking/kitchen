import { stationDependencies, type StationEntity } from "kitchen_station";
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

        await stationDependencies.updateStationUseCase.execute(input.stationId, input.station);
        sendMessage(`Saved station ${input.stationId}`);
        return {};
    }
}
