import { Task } from "../../../interface/task.js";
import { authenticateTask } from "../atoms/authenticateTask.js";
import { cloneTask } from "../atoms/cloneTask.js";
import { checkoutTask } from "../atoms/checkoutTask.js";
import { pullTask } from "../atoms/pullTask.js";

export type SetupRepoTaskInput = object;

export interface SetupRepoTaskOutput {
    token: string;
    expiresAt: string;
}

export const setupRepoTask: Task<SetupRepoTaskInput, SetupRepoTaskOutput> = {
    async execute(_input: SetupRepoTaskInput, sendMessage: (message: string) => void, signal?: AbortSignal): Promise<SetupRepoTaskOutput> {
        const authOutput = await authenticateTask.execute({}, sendMessage, signal);
        await cloneTask.execute({ token: authOutput.token }, sendMessage, signal);
        await checkoutTask.execute({}, sendMessage, signal);
        await pullTask.execute({}, sendMessage, signal);

        return { token: authOutput.token, expiresAt: authOutput.expiresAt };
    }
};
