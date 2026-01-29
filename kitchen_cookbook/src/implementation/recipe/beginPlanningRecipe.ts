import { Recipe } from "../../interface/recipe.js";
import { ExecutableStep } from "../../interface/step.js";
import { authenticateTask, AuthenticateTaskInput, AuthenticateTaskOutput } from "../task/atoms/authenticateTask.js";
import { cloneTask, CloneTaskInput, CloneTaskOutput } from "../task/atoms/cloneTask.js";

export type BeginPlanningRecipeInput = object;

export interface BeginPlanningRecipeOutput {
    alreadyExisted: boolean;
}

export const beginPlanningRecipe = new Recipe<BeginPlanningRecipeInput, BeginPlanningRecipeOutput>(
    "beginPlanningRecipe",
    [
        new ExecutableStep<AuthenticateTaskInput, AuthenticateTaskOutput>(
            "authenticateStep",
            authenticateTask,
            () => { return {}; }
        ),
        new ExecutableStep<CloneTaskInput, CloneTaskOutput>(
            "cloneStep",
            cloneTask,
            (previousOutputs: Map<string, object>) => {
                const authOutput = previousOutputs.get("authenticateStep") as AuthenticateTaskOutput;
                return { token: authOutput.token };
            }
        )
    ],
    (previousOutputs: Map<string, object>) => {
        const cloneOutput = previousOutputs.get("cloneStep") as CloneTaskOutput;
        return { alreadyExisted: cloneOutput.alreadyExisted };
    }
);
