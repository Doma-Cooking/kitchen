import { Recipe, recipeInputKey } from "../../interface/recipe.js";
import { ExecutableStep } from "../../interface/step.js";
import { worktreeAgentTask, WorktreeAgentTaskInput, WorktreeAgentTaskOutput } from "../task/organisms/worktreeAgentTask.js";
import { worktreeRemoveTask, WorktreeRemoveTaskInput, WorktreeRemoveTaskOutput } from "../task/atoms/git/worktreeRemoveTask.js";
import { stationId } from "./util.js";

const recipeId = "feedbackImplementationRecipe";

export interface FeedbackImplementationRecipeInput {
    issueId: string;
    issueTitle?: string;
    repo?: string;
    feedback: string;
    replyTo?: string;
    prNumber?: string;
}

export type FeedbackImplementationRecipeOutput = object;

export const feedbackImplementationRecipe = new Recipe<FeedbackImplementationRecipeInput, FeedbackImplementationRecipeOutput>(
    recipeId,
    [
        new ExecutableStep<WorktreeAgentTaskInput, WorktreeAgentTaskOutput>(
            "worktreeAgentStep",
            worktreeAgentTask,
            (outputs) => {
                const recipeInput = outputs.get(recipeInputKey) as FeedbackImplementationRecipeInput;
                return {
                    branch: `${recipeInput.issueId}-impl`,
                    promptId: recipeId,
                    stationId: stationId('implementation', recipeInput.issueId),
                    context: {
                        issue_number: recipeInput.issueId,
                        issue_title: recipeInput.issueTitle ?? '',
                        repo: recipeInput.repo ?? '',
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
