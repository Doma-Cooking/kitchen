import { prompts } from "../../../prompt/prompts.generated.js";
import { templates } from "../../../template/templates.generated.js";
import type { Configuration } from "../../../../../di/configuration.js";
import { Task } from "../../../../interface/task.js";

export interface FetchPromptTaskInput {
    promptId: string;
    context?: Record<string, string>;
}

export interface FetchPromptTaskOutput {
    prompt: string;
}

export const fetchPromptTask: Task<FetchPromptTaskInput, FetchPromptTaskOutput> = {
    async execute(input: FetchPromptTaskInput, _config: Configuration, sendMessage: (message: string) => void): Promise<FetchPromptTaskOutput> {
        await Promise.resolve();

        const raw = prompts[input.promptId];
        if (!raw) {
            throw new Error(`Prompt not found: ${input.promptId}`);
        }

        let resolved = raw;
        for (const [key, value] of Object.entries(templates)) {
            resolved = resolved.replaceAll(`{{templates.${key}}}`, value);
        }
        if (input.context) {
            for (const [key, value] of Object.entries(input.context)) {
                resolved = resolved.replaceAll(`{{context.${key}}}`, value);
            }
        }

        sendMessage(`Fetched prompt ${input.promptId}`);
        return { prompt: resolved };
    }
};
