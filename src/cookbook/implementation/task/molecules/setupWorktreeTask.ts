import type { Configuration } from "../../../../di/configuration.js";
import { Task } from "../../../interface/task.js";
import { setupRepoTask } from "./setupRepoTask.js";
import { worktreeAddTask } from "../atoms/git/worktreeAddTask.js";
import { pullTask } from "../atoms/git/pullTask.js";
import { pushTask } from "../atoms/git/pushTask.js";

export interface SetupWorktreeTaskInput {
    branch: string;
    repoUrl: string;
    clonePath: string;
    defaultBranch: string;
}

export interface SetupWorktreeTaskOutput {
    token: string;
    expiresAt: string;
    repoPath: string;
    worktreePath: string;
}

export const setupWorktreeTask: Task<SetupWorktreeTaskInput, SetupWorktreeTaskOutput> = {
    async execute(input: SetupWorktreeTaskInput, config: Configuration, sendMessage: (message: string) => void, signal?: AbortSignal): Promise<SetupWorktreeTaskOutput> {
        const setupOutput = await setupRepoTask.execute({ repoUrl: input.repoUrl, clonePath: input.clonePath, defaultBranch: input.defaultBranch }, config, sendMessage, signal);
        const worktreeOutput = await worktreeAddTask.execute({ repoPath: setupOutput.repoPath, branch: input.branch }, config, sendMessage, signal);

        if (worktreeOutput.created) {
            await pushTask.execute({ repoPath: worktreeOutput.worktreePath, branch: input.branch, setUpstream: true }, config, sendMessage, signal);
        } else {
            await pullTask.execute({ repoPath: worktreeOutput.worktreePath }, config, sendMessage, signal);
        }

        return {
            token: setupOutput.token,
            expiresAt: setupOutput.expiresAt,
            repoPath: setupOutput.repoPath,
            worktreePath: worktreeOutput.worktreePath,
        };
    }
};
