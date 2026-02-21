import { Recipe } from "../../interface/recipe.js";
import { ExecutableStep } from "../../interface/step.js";
import { mockTask, MockTaskInput, MockTaskOutput } from "../task/atoms/util/mockTask.js";

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
                const randFactor = Math.random() * 0.4 + 0.8;

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
                const randFactor = Math.random() * 0.4 + 0.8;

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
                const randFactor = Math.random() * 0.4 + 0.8;

                return {
                    taskTimeMs: (previousOutputs.get("recipeInitialInput") as MockRecipeInput).stepTimeMs * randFactor,
                    taskMessage: "Step 3 completed"
                };
            }
        )
    ],
    (previousOutputs: Map<string, object>) => {
        const step1Time = (previousOutputs.get("mockStep1") as MockTaskOutput).actualTimeMs;
        const step2Time = (previousOutputs.get("mockStep2") as MockTaskOutput).actualTimeMs;
        const step3Time = (previousOutputs.get("mockStep3") as MockTaskOutput).actualTimeMs;
        const totalTime = step1Time + step2Time + step3Time;
        return { runtimeMs: totalTime };
    }
)
