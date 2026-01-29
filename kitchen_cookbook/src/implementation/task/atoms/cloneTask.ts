import { access } from "node:fs/promises";
import { Task } from "../../../interface/task.js";
import { execTask } from "./execTask.js";

export interface CloneTaskInput {
    token?: string;
    path?: string;
}

export interface CloneTaskOutput {
    repoPath: string;
}

export const cloneTask: Task<CloneTaskInput, CloneTaskOutput> = {
    async execute(input: CloneTaskInput, sendMessage: (message: string) => void, signal?: AbortSignal): Promise<CloneTaskOutput> {
        const repoUrl = process.env.REPO_URL;
        if (!repoUrl) {
            throw new Error("REPO_URL environment variable is not set");
        }

        const repoPath = input.path ?? process.env.CLONE_PATH;
        if (!repoPath) {
            throw new Error("No path provided and CLONE_PATH environment variable is not set");
        }

        try {
            await access(repoPath);
            sendMessage(`Repository already exists at ${repoPath}`);
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

        await execTask.execute({ command: "git", args: ["clone", cloneUrl, repoPath] }, sendMessage, signal);

        sendMessage(`Successfully cloned repository to ${repoPath}`);
        return { repoPath };
    }
};
