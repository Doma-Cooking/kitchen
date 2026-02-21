import { Task } from "../../../interface/task.js";
import { notifyTask } from "../atoms/notify/notifyTask.js";
import { setupRepoTask } from "../molecules/setupRepoTask.js";
import { stationAgentTask } from "../molecules/stationAgentTask.js";

export interface RepoAgentTaskInput {
    promptId: string;
    stationId?: string;
    context?: Record<string, string>;
}

export interface RepoAgentTaskOutput {
    repoPath: string;
}

export const repoAgentTask: Task<RepoAgentTaskInput, RepoAgentTaskOutput> = {
    async execute(input: RepoAgentTaskInput, sendMessage: (message: string) => void, signal?: AbortSignal): Promise<RepoAgentTaskOutput> {
        const repo = input.context?.repo ?? '';
        const issue = input.context?.issue_number ?? '';
        const title = input.context?.issue_title ?? '';
        const label = `${input.promptId} for ${repo}#${issue} (${title})`;

        await notifyTask.execute({ message: `Starting ${label}` }, sendMessage);

        const setupOutput = await setupRepoTask.execute({}, sendMessage, signal);

        await stationAgentTask.execute(
            {
                promptId: input.promptId,
                workingDirectory: setupOutput.repoPath,
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
        };
    }
};
