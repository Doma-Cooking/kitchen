import { Recipe, recipeInputKey } from "../../interface/recipe.js";
import { ExecutableStep } from "../../interface/step.js";
import { worktreeAgentTask, WorktreeAgentTaskInput, WorktreeAgentTaskOutput } from "../task/organisms/worktreeAgentTask.js";
import { worktreeRemoveTask, WorktreeRemoveTaskInput, WorktreeRemoveTaskOutput } from "../task/atoms/git/worktreeRemoveTask.js";
const recipeId = "beginImplementationRecipe";

export interface BeginImplementationRecipeInput {
    issueId: string;
    issueTitle?: string;
    repo?: string;
    parentIssueId?: string;
    stationId: string;
}

export type BeginImplementationRecipeOutput = object;

export const beginImplementationRecipe = new Recipe<BeginImplementationRecipeInput, BeginImplementationRecipeOutput>(
    recipeId,
    [
        new ExecutableStep<WorktreeAgentTaskInput, WorktreeAgentTaskOutput>(
            "worktreeAgentStep",
            worktreeAgentTask,
            (outputs) => {
                const recipeInput = outputs.get(recipeInputKey) as BeginImplementationRecipeInput;
                return {
                    branch: `${recipeInput.issueId}-impl`,
                    promptId: recipeId,
                    stationId: recipeInput.stationId,
                    context: {
                        issue_number: recipeInput.issueId,
                        issue_title: recipeInput.issueTitle ?? '',
                        repo: recipeInput.repo ?? '',
                        parent_issue_number: recipeInput.parentIssueId ?? '',
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
