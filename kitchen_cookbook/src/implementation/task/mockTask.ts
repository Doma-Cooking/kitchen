import { Task } from "../../interface/task.js";

export interface MockTaskInput {
    taskTimeMs: number;
    taskMessage: string;
}

export interface MockTaskOutput {
    actualTimeMs: number;
}

export const mockTask: Task<MockTaskInput, MockTaskOutput> = {
    async execute(input: MockTaskInput, sendMessage: (message: string) => void): Promise<MockTaskOutput> {
        sendMessage(`Mock task started, will take ${input.taskTimeMs.toString()} ms`);
        await new Promise((resolve) => setTimeout(resolve, input.taskTimeMs));
        sendMessage(`Mock task completed: ${input.taskMessage}\nTook ${input.taskTimeMs.toString()} ms`);
        return { actualTimeMs: input.taskTimeMs };
    }
};
