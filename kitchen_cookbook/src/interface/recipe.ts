import { Step } from "./step.js";

const recipeInputKey = "recipeInitialInput";

export class Recipe<I extends object, O extends object> {
    id: string;
    instructions: Step;
    cleanupInstructions?: Step;
    mapOutput: (previousOutputs: Map<string, object>) => O;

    constructor(
        id: string,
        instructions: Step,
        mapOutput: (previousOutputs: Map<string, object>) => O,
        cleanupInstructions?: Step
    ) {
        this.id = id;
        this.instructions = instructions;
        this.cleanupInstructions = cleanupInstructions;
        this.mapOutput = mapOutput;
    }

    async execute(input: I, sendMessage: (message: string) => void, signal?: AbortSignal): Promise<O> {
        const inputs = new Map<string, object>();
        inputs.set(recipeInputKey, input);

        let currentOutputs: Map<string, object> = inputs;
        let error: Error | undefined;
        try {
            currentOutputs = await this.executeStep(this.instructions, input, inputs, sendMessage, signal);
        } catch (err) {
            error = err instanceof Error ? err : new Error("Unknown error during recipe execution");
            sendMessage(`Error during recipe execution: ${error.message}`);
        } finally {
            if (this.cleanupInstructions) {
                try {
                    await this.executeStep(this.cleanupInstructions, input, currentOutputs, sendMessage);
                } catch (error) {
                    const message = error instanceof Error ? error.message : "unknown error";
                    sendMessage(`Cleanup failed: ${message}`);
                }
            }
        }

        if (error) {
            throw error;
        }

        return this.mapOutput(currentOutputs);
    }

    private async executeStep(
        step: Step,
        input: I,
        outputs: Map<string, object>,
        sendMessage: (message: string) => void,
        signal?: AbortSignal
    ): Promise<Map<string, object>> {
        signal?.throwIfAborted();
        let currentOutputs = new Map(outputs);

        if (Array.isArray(step)) {
            for (const subStep of step) {
                currentOutputs = await this.executeStep(subStep, input, currentOutputs, sendMessage, signal);
            }
        } else {
            const output = await step.execute(currentOutputs, sendMessage, signal);
            currentOutputs.set(step.id, output);
        }

        return currentOutputs;
    }
}