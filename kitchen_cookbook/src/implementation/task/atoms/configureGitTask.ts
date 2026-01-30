import { Task } from "../../../interface/task.js";
import { execTask } from "./execTask.js";

export interface ConfigureGitTaskInput {
    repoPath: string;
}

export type ConfigureGitTaskOutput = object;

export const configureGitTask: Task<ConfigureGitTaskInput, ConfigureGitTaskOutput> = {
    async execute(input: ConfigureGitTaskInput, sendMessage: (message: string) => void, signal?: AbortSignal): Promise<ConfigureGitTaskOutput> {
        const appId = process.env.GITHUB_APP_ID;
        const appSlug = process.env.GITHUB_APP_SLUG;

        if (!appId || !appSlug) {
            throw new Error("GITHUB_APP_ID and GITHUB_APP_SLUG environment variables are required for git identity");
        }

        const name = `${appSlug}[bot]`;
        const email = `${appId}+${appSlug}[bot]@users.noreply.github.com`;

        sendMessage(`Configuring git identity as ${name}`);

        await execTask.execute({ command: "git", args: ["config", "user.name", name], workingDirectory: input.repoPath }, sendMessage, signal);
        await execTask.execute({ command: "git", args: ["config", "user.email", email], workingDirectory: input.repoPath }, sendMessage, signal);

        return {};
    }
};
