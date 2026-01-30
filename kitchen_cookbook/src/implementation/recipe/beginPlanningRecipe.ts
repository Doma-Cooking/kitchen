import { Recipe, recipeInputKey } from "../../interface/recipe.js";
import { ExecutableStep } from "../../interface/step.js";
import { setupWorktreeTask, SetupWorktreeTaskInput, SetupWorktreeTaskOutput } from "../task/molecules/setupWorktreeTask.js";
import { stationAgentTask, StationAgentTaskInput, StationAgentTaskOutput } from "../task/molecules/stationAgentTask.js";
import { worktreeRemoveTask, WorktreeRemoveTaskInput, WorktreeRemoveTaskOutput } from "../task/atoms/worktreeRemoveTask.js";
import { stationId } from "./util.js";

const recipeId = "beginPlanningRecipe";

export interface BeginPlanningRecipeInput {
    issueId: string;
}

export type BeginPlanningRecipeOutput = object;

export const beginPlanningRecipe = new Recipe<BeginPlanningRecipeInput, BeginPlanningRecipeOutput>(
    recipeId,
    [
        new ExecutableStep<SetupWorktreeTaskInput, SetupWorktreeTaskOutput>(
            "setupWorktreeStep",
            setupWorktreeTask,
            (outputs) => {
                const recipeInput = outputs.get(recipeInputKey) as BeginPlanningRecipeInput;
                return { branch: `${recipeInput.issueId}-plan` };
            }
        ),
        new ExecutableStep<StationAgentTaskInput, StationAgentTaskOutput>(
            "stationAgentStep",
            stationAgentTask,
            (outputs) => {
                const recipeInput = outputs.get(recipeInputKey) as BeginPlanningRecipeInput;
                const setupOutput = outputs.get("setupWorktreeStep") as SetupWorktreeTaskOutput;
                return {
                    promptId: recipeId,
                    workingDirectory: setupOutput.worktreePath,
                    stationId: stationId(recipeId, recipeInput.issueId),
                };
            }
        ),
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
