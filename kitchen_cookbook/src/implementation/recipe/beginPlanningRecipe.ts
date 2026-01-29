import { Recipe } from "../../interface/recipe.js";
import { ExecutableStep } from "../../interface/step.js";
import { setupRepoTask, SetupRepoTaskInput, SetupRepoTaskOutput } from "../task/molecules/setupRepoTask.js";

export type BeginPlanningRecipeInput = object;

export type BeginPlanningRecipeOutput = object;

export const beginPlanningRecipe = new Recipe<BeginPlanningRecipeInput, BeginPlanningRecipeOutput>(
    "beginPlanningRecipe",
    [
        new ExecutableStep<SetupRepoTaskInput, SetupRepoTaskOutput>(
            "setupRepoStep",
            setupRepoTask,
            () => { return {}; }
        )
    ],
    () => { return {}; }
);
