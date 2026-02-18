import { Recipe, recipeInputKey } from "../../interface/recipe.js";
import { ExecutableStep } from "../../interface/step.js";
import { repoAgentTask, RepoAgentTaskInput, RepoAgentTaskOutput } from "../task/organisms/repoAgentTask.js";
const recipeId = "createSubIssuesRecipe";

export interface CreateSubIssuesRecipeInput {
    issueId: string;
    issueTitle?: string;
    repo?: string;
    labelEnabled?: string;
    projectOwner?: string;
    projectNumber?: string;
    columnReady?: string;
    stationId: string;
}

export type CreateSubIssuesRecipeOutput = object;

export const createSubIssuesRecipe = new Recipe<CreateSubIssuesRecipeInput, CreateSubIssuesRecipeOutput>(
    recipeId,
    [
        new ExecutableStep<RepoAgentTaskInput, RepoAgentTaskOutput>(
            "repoAgentStep",
            repoAgentTask,
            (outputs) => {
                const recipeInput = outputs.get(recipeInputKey) as CreateSubIssuesRecipeInput;
                return {
                    promptId: recipeId,
                    stationId: recipeInput.stationId,
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
);
