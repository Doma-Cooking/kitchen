import { prompts } from "../../prompt/prompts.generated.js";
import { Task } from "../../../interface/task.js";

export interface FetchPromptTaskInput {
    promptId: string;
}

export interface FetchPromptTaskOutput {
    prompt: string;
}

export const fetchPromptTask: Task<FetchPromptTaskInput, FetchPromptTaskOutput> = {
    async execute(input: FetchPromptTaskInput, sendMessage: (message: string) => void): Promise<FetchPromptTaskOutput> {
        const prompt = prompts[input.promptId];
        if (!prompt) {
            throw new Error(`Prompt not found: ${input.promptId}`);
        }
        sendMessage(`Fetched prompt ${input.promptId}`);
        return { prompt };
    }
};
