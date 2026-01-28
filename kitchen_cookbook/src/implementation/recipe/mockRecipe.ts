import { Recipe } from "../../interface/recipe.js";
import { ExecutableStep } from "../../interface/step.js";
import { mockTask, MockTaskInput, MockTaskOutput } from "../task/mockTask.js";

export interface MockRecipeInput {
    stepTimeMs: number;
};

export interface MockRecipeOutput {
    runtimeMs: number;
}

export const mockRecipe = new Recipe<MockRecipeInput, MockRecipeOutput>(
    "mockRecipe",
    [
        new ExecutableStep<MockTaskInput, MockTaskOutput>(
            "mockStep1",
            mockTask,
            (previousOutputs: Map<string, object>) => {
                const randFactor = Math.random() * 0.4 + 0.8; // Random factor between 0.8 and 1.2

                return {
                    taskTimeMs: (previousOutputs.get("recipeInitialInput") as MockRecipeInput).stepTimeMs * randFactor,
                    taskMessage: "Step 1 completed"
                };
            }
        ),
        new ExecutableStep<MockTaskInput, MockTaskOutput>(
            "mockStep2",
            mockTask,
            (previousOutputs: Map<string, object>) => {
                const randFactor = Math.random() * 0.4 + 0.8; // Random factor between 0.8 and 1.2

                return {
                    taskTimeMs: (previousOutputs.get("recipeInitialInput") as MockRecipeInput).stepTimeMs * randFactor,
                    taskMessage: "Step 2 completed"
                };
            }
        ),
        new ExecutableStep<MockTaskInput, MockTaskOutput>(
            "mockStep3",
            mockTask,
            (previousOutputs: Map<string, object>) => {
                const randFactor = Math.random() * 0.4 + 0.8; // Random factor between 0.8 and 1.2

                return {
                    taskTimeMs: (previousOutputs.get("recipeInitialInput") as MockRecipeInput).stepTimeMs * randFactor,
                    taskMessage: "Step 3 completed"
                };
            }
        )
    ],
    (previousOutputs: Map<string, object>) => {
        const step1Time = (previousOutputs.get("mockStep1") as MockTaskOutput).actualTimeMs;
        const totalTime = step1Time;
        return { runtimeMs: totalTime };
    }
)
