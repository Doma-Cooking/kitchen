import type { Configuration } from "../../../../../di/configuration.js";
import { Task } from "../../../../interface/task.js";

export interface MockTaskInput {
    taskTimeMs: number;
    taskMessage: string;
}

export interface MockTaskOutput {
    actualTimeMs: number;
}

export const mockTask: Task<MockTaskInput, MockTaskOutput> = {
    async execute(input: MockTaskInput, _config: Configuration, sendMessage: (message: string) => void, signal?: AbortSignal): Promise<MockTaskOutput> {
        sendMessage(`Mock task started, will take ${input.taskTimeMs.toString()} ms`);
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(resolve, input.taskTimeMs);
            signal?.addEventListener("abort", () => {
                clearTimeout(timeout);
                reject(signal.reason as Error);
            });
        });
        sendMessage(`Mock task completed: ${input.taskMessage}\nTook ${input.taskTimeMs.toString()} ms`);
        return { actualTimeMs: input.taskTimeMs };
    }
};
