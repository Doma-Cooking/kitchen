import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { Task } from "../../../../interface/task.js";
import { execTask } from "../util/execTask.js";
import { worktreeRemoveTask } from "./worktreeRemoveTask.js";

export interface WorktreeAddTaskInput {
    repoPath: string;
    branch: string;
    path?: string;
}

export interface WorktreeAddTaskOutput {
    worktreePath: string;
    created: boolean;
}

export const worktreeAddTask: Task<WorktreeAddTaskInput, WorktreeAddTaskOutput> = {
    async execute(input: WorktreeAddTaskInput, sendMessage: (message: string) => void, signal?: AbortSignal): Promise<WorktreeAddTaskOutput> {
        const worktreePath = input.path ?? resolve(input.repoPath, `../${input.branch}`);

        sendMessage(`Adding worktree for branch ${input.branch} at ${worktreePath}`);

        // Remove existing worktree at the target path if present
        try {
            await access(worktreePath);
            sendMessage(`Found existing worktree at ${worktreePath}, removing it`);
            await worktreeRemoveTask.execute({ repoPath: input.repoPath, worktreePath: worktreePath }, sendMessage, signal);
        } catch {
            // No existing worktree at target path
        }

        // Try to add worktree with existing branch first
    try {
            await execTask.execute({ command: "git", args: ["worktree", "add", worktreePath, input.branch], workingDirectory: input.repoPath }, sendMessage, signal);
            sendMessage(`Successfully added worktree at ${worktreePath} with existing branch ${input.branch}`);
            return { worktreePath: worktreePath, created: false };
        } catch {
            // Branch doesn't exist, create a new one
        }

        await execTask.execute({ command: "git", args: ["worktree", "add", "-b", input.branch, worktreePath], workingDirectory: input.repoPath }, sendMessage, signal);
        sendMessage(`Successfully added worktree at ${worktreePath} with new branch ${input.branch}`);
        return { worktreePath: worktreePath, created: true };
    }
};
