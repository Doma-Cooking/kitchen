import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { Task } from "../../../interface/task.js";

export interface CloneTaskInput {
    token?: string;
}

export interface CloneTaskOutput {
    alreadyExisted: boolean;
}

export const cloneTask: Task<CloneTaskInput, CloneTaskOutput> = {
    async execute(input: CloneTaskInput, sendMessage: (message: string) => void, signal?: AbortSignal): Promise<CloneTaskOutput> {
        const repoUrl = process.env.REPO_URL;
        if (!repoUrl) {
            throw new Error("REPO_URL environment variable is not set");
        }
        const clonePath = process.env.CLONE_PATH;
        if (!clonePath) {
            throw new Error("CLONE_PATH environment variable is not set");
        }

        try {
            await access(clonePath);
            sendMessage(`Repository already exists at ${clonePath}`);
            return { alreadyExisted: true };
        } catch {
            // Directory does not exist, proceed with clone
        }

        sendMessage(`Cloning repository to ${clonePath}`);

        let cloneUrl = repoUrl;
        if (input.token) {
            const url = new URL(repoUrl);
            url.username = "x-access-token";
            url.password = input.token;
            cloneUrl = url.toString();
        }

        await new Promise<void>((resolve, reject) => {
            const child = execFile("git", ["clone", cloneUrl, clonePath], (error) => {
                if (error) {
                    reject(error as Error);
                } else {
                    resolve();
                }
            });

            signal?.addEventListener("abort", () => {
                child.kill();
                reject(new Error("Clone aborted", { cause: signal.reason }));
            });
        });

        sendMessage(`Successfully cloned repository to ${clonePath}`);
        return { alreadyExisted: false };
    }
};
