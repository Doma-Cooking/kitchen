import type { Configuration } from "../../../../../di/configuration.js";
import { Task } from "../../../../interface/task.js";
import { execTask } from "../util/execTask.js";

export interface CheckoutTaskInput {
    repoPath: string;
    branch?: string;
    defaultBranch?: string;
}

export interface CheckoutTaskOutput {
    branch: string;
}

export const checkoutTask: Task<CheckoutTaskInput, CheckoutTaskOutput> = {
    async execute(input: CheckoutTaskInput, config: Configuration, sendMessage: (message: string) => void, signal?: AbortSignal): Promise<CheckoutTaskOutput> {
        const branch = input.branch ?? input.defaultBranch;
        if (!branch) {
            throw new Error("No branch or defaultBranch provided");
        }

        sendMessage(`Checking out branch ${branch}`);

        await execTask.execute({ command: "git", args: ["checkout", branch], workingDirectory: input.repoPath }, config, sendMessage, signal);

        sendMessage(`Successfully checked out branch ${branch}`);
        return { branch };
    }
};
