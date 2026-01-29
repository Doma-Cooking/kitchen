import { access } from "node:fs/promises";
import { Task } from "../../../interface/task.js";
import { execTask } from "./execTask.js";

export interface WorktreeRemoveTaskInput {
    repoPath: string;
    worktreePath: string;
}

export type WorktreeRemoveTaskOutput = object;

export const worktreeRemoveTask: Task<WorktreeRemoveTaskInput, WorktreeRemoveTaskOutput> = {
    async execute(input: WorktreeRemoveTaskInput, sendMessage: (message: string) => void, signal?: AbortSignal): Promise<WorktreeRemoveTaskOutput> {
        try {
            await access(input.worktreePath);
        } catch {
            sendMessage(`No worktree found at ${input.worktreePath}, skipping removal`);
            return {};
        }

        sendMessage(`Removing worktree at ${input.worktreePath}`);
        await execTask.execute({ command: "git", args: ["worktree", "remove", "--force", input.worktreePath], workingDirectory: input.repoPath }, sendMessage, signal);

        sendMessage(`Successfully removed worktree at ${input.worktreePath}`);
        return {};
    }
};
