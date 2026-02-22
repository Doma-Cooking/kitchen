import type { RepoConfig } from "../../../di/configuration.js";
import { Recipe, recipeInputKey } from "../../interface/recipe.js";
import { ExecutableStep } from "../../interface/step.js";
import { worktreeAgentTask, WorktreeAgentTaskInput, WorktreeAgentTaskOutput } from "../task/organisms/worktreeAgentTask.js";
import { worktreeRemoveTask, WorktreeRemoveTaskInput, WorktreeRemoveTaskOutput } from "../task/atoms/git/worktreeRemoveTask.js";
import { stationId } from "./util.js";

const recipeId = "feedbackPlanningRecipe";

export interface FeedbackPlanningRecipeInput {
    issueId: string;
    issueTitle?: string;
    repoConfig: RepoConfig;
    feedback: string;
    replyTo?: string;
    prNumber?: string;
}

export type FeedbackPlanningRecipeOutput = object;

export const feedbackPlanningRecipe = new Recipe<FeedbackPlanningRecipeInput, FeedbackPlanningRecipeOutput>(
    recipeId,
    [
        new ExecutableStep<WorktreeAgentTaskInput, WorktreeAgentTaskOutput>(
            "worktreeAgentStep",
            worktreeAgentTask,
            (outputs) => {
                const recipeInput = outputs.get(recipeInputKey) as FeedbackPlanningRecipeInput;
                return {
                    repoConfig: recipeInput.repoConfig,
                    branch: `${recipeInput.issueId}-plan`,
                    promptId: recipeId,
                    stationId: stationId('planning', recipeInput.repoConfig.fullName, recipeInput.issueId),
                    context: {
                        issue_number: recipeInput.issueId,
                        issue_title: recipeInput.issueTitle ?? '',
                        repo: recipeInput.repoConfig.fullName,
                        feedback: recipeInput.feedback,
                        reply_to: recipeInput.replyTo ?? '',
                        pr_number: recipeInput.prNumber ?? '',
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
