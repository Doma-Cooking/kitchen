import { Task } from "../../../interface/task.js";
import { notifyTask } from "../atoms/notify/notifyTask.js";
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
        const repo = input.context?.repo ?? '';
        const issue = input.context?.issue_number ?? '';
        const title = input.context?.issue_title ?? '';
        const label = `${input.promptId} for ${repo}#${issue} (${title})`;

        await notifyTask.execute({ message: `Starting ${label}` }, sendMessage);

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

        await notifyTask.execute({ message: `Finished ${label}` }, sendMessage);

        return {
            repoPath: setupOutput.repoPath,
            worktreePath: setupOutput.worktreePath,
        };
    }
};
