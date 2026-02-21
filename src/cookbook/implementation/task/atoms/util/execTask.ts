import { execFile } from "node:child_process";
import { Task } from "../../../../interface/task.js";

export interface ExecTaskInput {
    command: string;
    args: string[];
    workingDirectory?: string;
}

export type ExecTaskOutput = object;

export const execTask: Task<ExecTaskInput, ExecTaskOutput> = {
    async execute(input: ExecTaskInput, _sendMessage: (message: string) => void, signal?: AbortSignal): Promise<ExecTaskOutput> {
        await new Promise<void>((resolve, reject) => {
            const child = execFile(input.command, input.args, { cwd: input.workingDirectory }, (error) => {
                if (error) {
                    reject(error as Error);
                } else {
                    resolve();
                }
            });

            signal?.addEventListener("abort", () => {
                child.kill();
                reject(new Error(`Exec aborted: ${input.command} ${input.args.join(" ")}`, { cause: signal.reason }));
            });
        });

        return {};
    }
};
