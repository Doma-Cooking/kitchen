import { Recipe, recipeInputKey } from "../../interface/recipe.js";
import { ExecutableStep } from "../../interface/step.js";
import { worktreeAgentTask, WorktreeAgentTaskInput, WorktreeAgentTaskOutput } from "../task/organisms/worktreeAgentTask.js";
import { worktreeRemoveTask, WorktreeRemoveTaskInput, WorktreeRemoveTaskOutput } from "../task/atoms/git/worktreeRemoveTask.js";
import { stationId } from "./util.js";

const recipeId = "createSubIssuesRecipe";

export interface CreateSubIssuesRecipeInput {
    issueId: string;
    issueTitle?: string;
    repo?: string;
    labelEnabled?: string;
    projectOwner?: string;
    projectNumber?: string;
    columnReady?: string;
}

export type CreateSubIssuesRecipeOutput = object;

export const createSubIssuesRecipe = new Recipe<CreateSubIssuesRecipeInput, CreateSubIssuesRecipeOutput>(
    recipeId,
    [
        new ExecutableStep<WorktreeAgentTaskInput, WorktreeAgentTaskOutput>(
            "worktreeAgentStep",
            worktreeAgentTask,
            (outputs) => {
                const recipeInput = outputs.get(recipeInputKey) as CreateSubIssuesRecipeInput;
                return {
                    branch: `${recipeInput.issueId}-plan`,
                    promptId: recipeId,
                    stationId: stationId('planning', recipeInput.issueId),
                    context: {
                        issue_number: recipeInput.issueId,
                        issue_title: recipeInput.issueTitle ?? '',
                        repo: recipeInput.repo ?? '',
                        label_enabled: recipeInput.labelEnabled ?? '',
                        project_owner: recipeInput.projectOwner ?? '',
                        project_number: recipeInput.projectNumber ?? '',
                        column_ready: recipeInput.columnReady ?? '',
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
