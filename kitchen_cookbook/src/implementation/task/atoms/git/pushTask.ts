import { Task } from "../../../../interface/task.js";
import { execTask } from "../util/execTask.js";

export interface PushTaskInput {
    repoPath: string;
    branch: string;
    setUpstream?: boolean;
}

export interface PushTaskOutput {
    success: boolean;
}

export const pushTask: Task<PushTaskInput, PushTaskOutput> = {
    async execute(input: PushTaskInput, sendMessage: (message: string) => void, signal?: AbortSignal): Promise<PushTaskOutput> {
        const args = input.setUpstream
            ? ["push", "-u", "origin", input.branch]
            : ["push"];

        sendMessage(`Pushing branch ${input.branch}${input.setUpstream ? ' (setting upstream)' : ''}`);

        await execTask.execute({ command: "git", args, workingDirectory: input.repoPath }, sendMessage, signal);

        sendMessage(`Successfully pushed branch ${input.branch}`);
        return { success: true };
    }
};
