import { Task } from "../../../../interface/task.js";
import { execTask } from "../util/execTask.js";

export interface PullTaskInput {
    repoPath: string;
}

export interface PullTaskOutput {
    success: boolean;
}

export const pullTask: Task<PullTaskInput, PullTaskOutput> = {
    async execute(input: PullTaskInput, sendMessage: (message: string) => void, signal?: AbortSignal): Promise<PullTaskOutput> {
        sendMessage("Pulling latest changes");

        await execTask.execute({ command: "git", args: ["pull"], workingDirectory: input.repoPath }, sendMessage, signal);

        sendMessage("Successfully pulled latest changes");
        return { success: true };
    }
};
