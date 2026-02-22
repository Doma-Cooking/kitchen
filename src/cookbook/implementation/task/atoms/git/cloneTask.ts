import { access } from "node:fs/promises";
import type { Configuration } from "../../../../../di/configuration.js";
import { Task } from "../../../../interface/task.js";
import { execTask } from "../util/execTask.js";

export interface CloneTaskInput {
    repoUrl: string;
    clonePath: string;
    token?: string;
}

export interface CloneTaskOutput {
    repoPath: string;
}

export const cloneTask: Task<CloneTaskInput, CloneTaskOutput> = {
    async execute(input: CloneTaskInput, config: Configuration, sendMessage: (message: string) => void, signal?: AbortSignal): Promise<CloneTaskOutput> {
        const repoUrl = input.repoUrl;
        if (!repoUrl) {
            throw new Error("repoUrl is required");
        }

        const repoPath = input.clonePath;
        if (!repoPath) {
            throw new Error("clonePath is required");
        }

        try {
            await access(repoPath);
            sendMessage(`Repository already exists at ${repoPath}`);

            if (input.token) {
                const url = new URL(repoUrl);
                url.username = "x-access-token";
                url.password = input.token;
                await execTask.execute({ command: "git", args: ["remote", "set-url", "origin", url.toString()], workingDirectory: repoPath }, config, sendMessage, signal);
            }

            return { repoPath };
        } catch {
            // Directory does not exist, proceed with clone
        }

        sendMessage(`Cloning repository to ${repoPath}`);

        let cloneUrl = repoUrl;
        if (input.token) {
            const url = new URL(repoUrl);
            url.username = "x-access-token";
            url.password = input.token;
            cloneUrl = url.toString();
        }

        await execTask.execute({ command: "git", args: ["clone", cloneUrl, repoPath] }, config, sendMessage, signal);

        sendMessage(`Successfully cloned repository to ${repoPath}`);
        return { repoPath };
    }
};
