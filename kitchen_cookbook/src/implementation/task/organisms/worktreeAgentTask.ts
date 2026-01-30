import { Task } from "../../../interface/task.js";
import { setupWorktreeTask } from "../molecules/setupWorktreeTask.js";
import { stationAgentTask } from "../molecules/stationAgentTask.js";

export interface WorktreeAgentTaskInput {
    branch: string;
    promptId: string;
    stationId?: string;
    context?: Record<string, string>;
}

export interface WorktreeAgentTaskOutput {
    repoPath: string;
    worktreePath: string;
}

export const worktreeAgentTask: Task<WorktreeAgentTaskInput, WorktreeAgentTaskOutput> = {
    async execute(input: WorktreeAgentTaskInput, sendMessage: (message: string) => void, signal?: AbortSignal): Promise<WorktreeAgentTaskOutput> {
        const setupOutput = await setupWorktreeTask.execute(
            { branch: input.branch },
            sendMessage,
            signal,
        );

        await stationAgentTask.execute(
            {
                promptId: input.promptId,
                workingDirectory: setupOutput.worktreePath,
                stationId: input.stationId,
                token: setupOutput.token,
                context: input.context,
            },
            sendMessage,
            signal,
        );

        return {
            repoPath: setupOutput.repoPath,
            worktreePath: setupOutput.worktreePath,
        };
    }
};
