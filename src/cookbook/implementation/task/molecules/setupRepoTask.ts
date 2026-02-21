import type { Configuration } from "../../../../di/configuration.js";
import { Task } from "../../../interface/task.js";
import { authenticateTask } from "../atoms/project/authenticateTask.js";
import { cloneTask } from "../atoms/git/cloneTask.js";
import { checkoutTask } from "../atoms/git/checkoutTask.js";
import { configureGitTask } from "../atoms/git/configureGitTask.js";
import { pullTask } from "../atoms/git/pullTask.js";

export type SetupRepoTaskInput = object;

export interface SetupRepoTaskOutput {
    token: string;
    expiresAt: string;
    repoPath: string;
}

export const setupRepoTask: Task<SetupRepoTaskInput, SetupRepoTaskOutput> = {
    async execute(_input: SetupRepoTaskInput, config: Configuration, sendMessage: (message: string) => void, signal?: AbortSignal): Promise<SetupRepoTaskOutput> {
        const authOutput = await authenticateTask.execute({}, config, sendMessage, signal);
        const cloneOutput = await cloneTask.execute({ token: authOutput.token }, config, sendMessage, signal);
        await configureGitTask.execute({ repoPath: cloneOutput.repoPath }, config, sendMessage, signal);
        await checkoutTask.execute({ repoPath: cloneOutput.repoPath }, config, sendMessage, signal);
        await pullTask.execute({ repoPath: cloneOutput.repoPath }, config, sendMessage, signal);

        return { token: authOutput.token, expiresAt: authOutput.expiresAt, repoPath: cloneOutput.repoPath };
    }
};
