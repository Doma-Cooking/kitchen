import type { Configuration } from "../../../../../di/configuration.js";
import { Task } from "../../../../interface/task.js";
import { execTask } from "../util/execTask.js";

export interface ConfigureGitTaskInput {
    repoPath: string;
}

export type ConfigureGitTaskOutput = object;

export const configureGitTask: Task<ConfigureGitTaskInput, ConfigureGitTaskOutput> = {
    async execute(input: ConfigureGitTaskInput, config: Configuration, sendMessage: (message: string) => void, signal?: AbortSignal): Promise<ConfigureGitTaskOutput> {
        const appId = config.githubAppId;
        const appSlug = config.githubAppSlug;

        if (!appId || !appSlug) {
            throw new Error("GITHUB_APP_ID and GITHUB_APP_SLUG are required for git identity");
        }

        const name = `${appSlug}[bot]`;
        const email = `${appId}+${appSlug}[bot]@users.noreply.github.com`;

        sendMessage(`Configuring git identity as ${name}`);

        await execTask.execute({ command: "git", args: ["config", "--global", "user.name", name], workingDirectory: input.repoPath }, config, sendMessage, signal);
        await execTask.execute({ command: "git", args: ["config", "--global", "user.email", email], workingDirectory: input.repoPath }, config, sendMessage, signal);

        return {};
    }
};
