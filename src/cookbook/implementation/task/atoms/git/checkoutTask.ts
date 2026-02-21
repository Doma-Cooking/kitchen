import type { Configuration } from "../../../../../di/configuration.js";
import { Task } from "../../../../interface/task.js";
import { execTask } from "../util/execTask.js";

export interface CheckoutTaskInput {
    repoPath: string;
    branch?: string;
}

export interface CheckoutTaskOutput {
    branch: string;
}

export const checkoutTask: Task<CheckoutTaskInput, CheckoutTaskOutput> = {
    async execute(input: CheckoutTaskInput, config: Configuration, sendMessage: (message: string) => void, signal?: AbortSignal): Promise<CheckoutTaskOutput> {
        const branch = input.branch ?? config.mainBranch;
        if (!branch) {
            throw new Error("No branch provided and MAIN_BRANCH is not configured");
        }

        sendMessage(`Checking out branch ${branch}`);

        await execTask.execute({ command: "git", args: ["checkout", branch], workingDirectory: input.repoPath }, config, sendMessage, signal);

        sendMessage(`Successfully checked out branch ${branch}`);
        return { branch };
    }
};
