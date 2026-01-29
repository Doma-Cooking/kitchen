import { Recipe, recipeInputKey } from "../../interface/recipe.js";
import { ExecutableStep } from "../../interface/step.js";
import { setupWorktreeTask, SetupWorktreeTaskInput, SetupWorktreeTaskOutput } from "../task/molecules/setupWorktreeTask.js";
import { worktreeRemoveTask, WorktreeRemoveTaskInput, WorktreeRemoveTaskOutput } from "../task/atoms/worktreeRemoveTask.js";

export interface BeginPlanningRecipeInput {
    issueId: string;
};

export type BeginPlanningRecipeOutput = object;

export const beginPlanningRecipe = new Recipe<BeginPlanningRecipeInput, BeginPlanningRecipeOutput>(
    "beginPlanningRecipe",
    [
        new ExecutableStep<SetupWorktreeTaskInput, SetupWorktreeTaskOutput>(
            "setupWorktreeStep",
            setupWorktreeTask,
            (outputs) => {
                const recipeInput = outputs.get(recipeInputKey) as BeginPlanningRecipeInput;
                return { branch: `${recipeInput.issueId}-plan` };
            }
        )
    ],
    () => { return {}; },
    new ExecutableStep<WorktreeRemoveTaskInput, WorktreeRemoveTaskOutput>(
        "worktreeCleanupStep",
        worktreeRemoveTask,
        (outputs) => {
            const setupOutput = outputs.get("setupWorktreeStep") as SetupWorktreeTaskOutput;
            return { repoPath: setupOutput.repoPath, worktreePath: setupOutput.worktreePath };
        }
    )
);
