import { Step } from "./step.js";

const recipeInputKey = "recipeInitialInput";

export class Recipe<I extends object, O extends object> {
    id: string;
    instructions: Step;
    mapOutput: (previousOutputs: Map<string, object>) => O;

    constructor(
        id: string,
        instructions: Step,
        mapOutput: (previousOutputs: Map<string, object>) => O
    ) {
        this.id = id;
        this.instructions = instructions;
        this.mapOutput = mapOutput;
    }

    async execute(input: I, sendMessage: (message: string) => void): Promise<O> {
        const inputs = new Map<string, object>();
        inputs.set(recipeInputKey, input);
        const outputs = await this.executeStep(this.instructions, input, inputs, sendMessage);
        return this.mapOutput(outputs);
    }

    private async executeStep(
        step: Step,
        input: I,
        outputs: Map<string, object>,
        sendMessage: (message: string) => void
    ): Promise<Map<string, object>> {
        let currentOutputs = new Map(outputs);

        if (Array.isArray(step)) {
            for (const subStep of step) {
                currentOutputs = await this.executeStep(subStep, input, currentOutputs, sendMessage);
            }
        } else {
            const output = await step.execute(currentOutputs, sendMessage);
            currentOutputs.set(step.id, output);
        }

        return currentOutputs;
    }
}