import { execFile } from "node:child_process";
import { Task } from "../../../interface/task.js";

export type PullTaskInput = object;

export interface PullTaskOutput {
    success: boolean;
}

export const pullTask: Task<PullTaskInput, PullTaskOutput> = {
    async execute(_input: PullTaskInput, sendMessage: (message: string) => void, signal?: AbortSignal): Promise<PullTaskOutput> {
        const clonePath = process.env.CLONE_PATH;
        if (!clonePath) {
            throw new Error("CLONE_PATH environment variable is not set");
        }

        sendMessage("Pulling latest changes");

        await new Promise<void>((resolve, reject) => {
            const child = execFile("git", ["pull"], { cwd: clonePath }, (error) => {
                if (error) {
                    reject(error as Error);
                } else {
                    resolve();
                }
            });

            signal?.addEventListener("abort", () => {
                child.kill();
                reject(new Error("Pull aborted", { cause: signal.reason }));
            });
        });

        sendMessage("Successfully pulled latest changes");
        return { success: true };
    }
};
