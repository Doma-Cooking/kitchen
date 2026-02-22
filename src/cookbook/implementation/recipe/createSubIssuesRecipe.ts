import type { RepoConfig } from "../../../di/configuration.js";
import { Recipe, recipeInputKey } from "../../interface/recipe.js";
import { ExecutableStep } from "../../interface/step.js";
import { repoAgentTask, RepoAgentTaskInput, RepoAgentTaskOutput } from "../task/organisms/repoAgentTask.js";
import { stationId } from "./util.js";

const recipeId = "createSubIssuesRecipe";

export interface CreateSubIssuesRecipeInput {
    issueId: string;
    issueTitle?: string;
    repoConfig: RepoConfig;
    labelEnabled?: string;
    projectOwner?: string;
    projectNumber?: string;
    columnReady?: string;
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
                    repoConfig: recipeInput.repoConfig,
                    promptId: recipeId,
                    stationId: stationId('planning', recipeInput.repoConfig.fullName, recipeInput.issueId),
                    context: {
                        issue_number: recipeInput.issueId,
                        issue_title: recipeInput.issueTitle ?? '',
                        repo: recipeInput.repoConfig.fullName,
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
