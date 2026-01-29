import { execFile } from "node:child_process";
import { Task } from "../../../interface/task.js";

export interface CheckoutTaskInput {
    branch?: string;
}

export interface CheckoutTaskOutput {
    branch: string;
}

export const checkoutTask: Task<CheckoutTaskInput, CheckoutTaskOutput> = {
    async execute(input: CheckoutTaskInput, sendMessage: (message: string) => void, signal?: AbortSignal): Promise<CheckoutTaskOutput> {
        const clonePath = process.env.CLONE_PATH;
        if (!clonePath) {
            throw new Error("CLONE_PATH environment variable is not set");
        }

        const branch = input.branch ?? process.env.MAIN_BRANCH;
        if (!branch) {
            throw new Error("No branch provided and MAIN_BRANCH environment variable is not set");
        }

        sendMessage(`Checking out branch ${branch}`);

        await new Promise<void>((resolve, reject) => {
            const child = execFile("git", ["checkout", branch], { cwd: clonePath }, (error) => {
                if (error) {
                    reject(error as Error);
                } else {
                    resolve();
                }
            });

            signal?.addEventListener("abort", () => {
                child.kill();
                reject(new Error("Checkout aborted", { cause: signal.reason }));
            });
        });

        sendMessage(`Successfully checked out branch ${branch}`);
        return { branch };
    }
};
