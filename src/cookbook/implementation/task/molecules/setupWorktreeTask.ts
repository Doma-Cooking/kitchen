import { Task } from "../../../interface/task.js";
import { setupRepoTask } from "./setupRepoTask.js";
import { worktreeAddTask } from "../atoms/git/worktreeAddTask.js";
import { pullTask } from "../atoms/git/pullTask.js";
import { pushTask } from "../atoms/git/pushTask.js";

export interface SetupWorktreeTaskInput {
    branch: string;
}

export interface SetupWorktreeTaskOutput {
    token: string;
    expiresAt: string;
    repoPath: string;
    worktreePath: string;
}

export const setupWorktreeTask: Task<SetupWorktreeTaskInput, SetupWorktreeTaskOutput> = {
    async execute(input: SetupWorktreeTaskInput, sendMessage: (message: string) => void, signal?: AbortSignal): Promise<SetupWorktreeTaskOutput> {
        const setupOutput = await setupRepoTask.execute({}, sendMessage, signal);
        const worktreeOutput = await worktreeAddTask.execute({ repoPath: setupOutput.repoPath, branch: input.branch }, sendMessage, signal);

        if (worktreeOutput.created) {
            await pushTask.execute({ repoPath: worktreeOutput.worktreePath, branch: input.branch, setUpstream: true }, sendMessage, signal);
        } else {
            await pullTask.execute({ repoPath: worktreeOutput.worktreePath }, sendMessage, signal);
        }

        return {
            token: setupOutput.token,
            expiresAt: setupOutput.expiresAt,
            repoPath: setupOutput.repoPath,
            worktreePath: worktreeOutput.worktreePath,
        };
    }
};
