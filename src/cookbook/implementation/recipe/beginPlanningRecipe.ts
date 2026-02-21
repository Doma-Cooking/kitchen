import { Recipe, recipeInputKey } from "../../interface/recipe.js";
import { ExecutableStep } from "../../interface/step.js";
import { worktreeAgentTask, WorktreeAgentTaskInput, WorktreeAgentTaskOutput } from "../task/organisms/worktreeAgentTask.js";
import { worktreeRemoveTask, WorktreeRemoveTaskInput, WorktreeRemoveTaskOutput } from "../task/atoms/git/worktreeRemoveTask.js";
import { stationId } from "./util.js";

const recipeId = "beginPlanningRecipe";

export interface BeginPlanningRecipeInput {
    issueId: string;
    issueTitle?: string;
    repo?: string;
}

export type BeginPlanningRecipeOutput = object;

export const beginPlanningRecipe = new Recipe<BeginPlanningRecipeInput, BeginPlanningRecipeOutput>(
    recipeId,
    [
        new ExecutableStep<WorktreeAgentTaskInput, WorktreeAgentTaskOutput>(
            "worktreeAgentStep",
            worktreeAgentTask,
            (outputs) => {
                const recipeInput = outputs.get(recipeInputKey) as BeginPlanningRecipeInput;
                return {
                    branch: `${recipeInput.issueId}-plan`,
                    promptId: recipeId,
                    stationId: stationId('planning', recipeInput.issueId),
                    context: {
                        issue_number: recipeInput.issueId,
                        issue_title: recipeInput.issueTitle ?? '',
                        repo: recipeInput.repo ?? '',
                    },
                };
            }
        ),
    ],
    () => { return {}; },
    new ExecutableStep<WorktreeRemoveTaskInput, WorktreeRemoveTaskOutput>(
        "worktreeCleanupStep",
        worktreeRemoveTask,
        (outputs) => {
            const worktreeOutput = outputs.get("worktreeAgentStep") as WorktreeAgentTaskOutput;
            return { repoPath: worktreeOutput.repoPath, worktreePath: worktreeOutput.worktreePath };
        }
    )
);
