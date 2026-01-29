import { Task } from "../../../interface/task.js";
import { execTask } from "./execTask.js";

export interface CheckoutTaskInput {
    repoPath: string;
    branch?: string;
}

export interface CheckoutTaskOutput {
    branch: string;
}

export const checkoutTask: Task<CheckoutTaskInput, CheckoutTaskOutput> = {
    async execute(input: CheckoutTaskInput, sendMessage: (message: string) => void, signal?: AbortSignal): Promise<CheckoutTaskOutput> {
        const branch = input.branch ?? process.env.MAIN_BRANCH;
        if (!branch) {
            throw new Error("No branch provided and MAIN_BRANCH environment variable is not set");
        }

        sendMessage(`Checking out branch ${branch}`);

        await execTask.execute({ command: "git", args: ["checkout", branch], workingDirectory: input.repoPath }, sendMessage, signal);

        sendMessage(`Successfully checked out branch ${branch}`);
        return { branch };
    }
};
