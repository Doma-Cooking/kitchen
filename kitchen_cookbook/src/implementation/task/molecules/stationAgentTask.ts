import { Task } from "../../../interface/task.js";
import { fetchStationTask } from "../atoms/agent/fetchStationTask.js";
import { saveStationTask } from "../atoms/agent/saveStationTask.js";
import { agentTask } from "./agentTask.js";

export interface StationAgentTaskInput {
    promptId: string;
    workingDirectory: string;
    stationId?: string;
    token?: string;
    context?: Record<string, string>;
}

export type StationAgentTaskOutput = object;

export const stationAgentTask: Task<StationAgentTaskInput, StationAgentTaskOutput> = {
    async execute(input: StationAgentTaskInput, sendMessage: (message: string) => void, signal?: AbortSignal): Promise<StationAgentTaskOutput> {
        const station = input.stationId
            ? (await fetchStationTask.execute({ stationId: input.stationId }, sendMessage, signal)).station
            : undefined;

        const agentOutput = await agentTask.execute(
            { promptId: input.promptId, workingDirectory: input.workingDirectory, station, token: input.token, context: input.context },
            sendMessage,
            signal,
        );

        if (input.stationId && agentOutput.station) {
            await saveStationTask.execute(
                { stationId: input.stationId, station: agentOutput.station },
                sendMessage,
                signal,
            );
        }

        return {};
    }
};
