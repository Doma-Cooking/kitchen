import { Task } from "../../../interface/task.js";
import { setupRepoTask } from "./setupRepoTask.js";
import { worktreeAddTask } from "../atoms/git/worktreeAddTask.js";

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

        return {
            token: setupOutput.token,
            expiresAt: setupOutput.expiresAt,
            repoPath: setupOutput.repoPath,
            worktreePath: worktreeOutput.worktreePath,
        };
    }
};
