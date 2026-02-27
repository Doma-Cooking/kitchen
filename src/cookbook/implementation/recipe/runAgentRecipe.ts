import { join } from "node:path";
import type { RepoConfig } from "../../../di/configuration.js";
import { Recipe, recipeInputKey } from "../../interface/recipe.js";
import { ExecutableStep } from "../../interface/step.js";
import { worktreeAgentTask, WorktreeAgentTaskInput, WorktreeAgentTaskOutput } from "../task/organisms/worktreeAgentTask.js";
import { worktreeRemoveTask, WorktreeRemoveTaskInput, WorktreeRemoveTaskOutput } from "../task/atoms/git/worktreeRemoveTask.js";
import { stationId } from "./util.js";

const recipeId = "runAgentRecipe";

export interface ReplyTo {
    type: 'github_issue' | 'github_pr' | 'slack_thread';
    owner?: string;
    repo?: string;
    issue_number?: string;
    pr_number?: string;
    channel?: string;
    thread_ts?: string;
}

export interface RunAgentRecipeInput {
    issueId: string;
    issueTitle?: string;
    repoConfig: RepoConfig;
    instruction?: string;
    feedback?: string;
    prNumber?: string;
    parentIssueId?: string;
    replyTo?: ReplyTo;
}

export type RunAgentRecipeOutput = object;

function serializeReplyTo(replyTo: ReplyTo): string {
    switch (replyTo.type) {
        case 'github_issue':
            return `GitHub Issue: ${replyTo.owner}/${replyTo.repo}#${replyTo.issue_number}`;
        case 'github_pr':
            return `GitHub PR: ${replyTo.owner}/${replyTo.repo}#${replyTo.pr_number}`;
        case 'slack_thread':
            return `Slack Thread: channel=${replyTo.channel}, thread_ts=${replyTo.thread_ts}`;
    }
}

export const runAgentRecipe = new Recipe<RunAgentRecipeInput, RunAgentRecipeOutput>(
    recipeId,
    [
        new ExecutableStep<WorktreeAgentTaskInput, WorktreeAgentTaskOutput>(
            "worktreeAgentStep",
            worktreeAgentTask,
            (outputs) => {
                const recipeInput = outputs.get(recipeInputKey) as RunAgentRecipeInput;

                const context: Record<string, string> = {
                    issue_number: recipeInput.issueId,
                    issue_title: recipeInput.issueTitle ?? '',
                    repo: recipeInput.repoConfig.fullName,
                };

                if (recipeInput.instruction) {
                    context.instruction = recipeInput.instruction;
                }
                if (recipeInput.feedback) {
                    context.feedback = recipeInput.feedback;
                }
                if (recipeInput.prNumber) {
                    context.pr_number = recipeInput.prNumber;
                }
                if (recipeInput.parentIssueId) {
                    context.parent_issue_number = recipeInput.parentIssueId;
                }
                if (recipeInput.replyTo) {
                    context.reply_channel = serializeReplyTo(recipeInput.replyTo);
                }

                return {
                    repoConfig: recipeInput.repoConfig,
                    branch: `${recipeInput.issueId}-agent`,
                    promptId: recipeId,
                    stationId: stationId('agent', recipeInput.repoConfig.fullName, recipeInput.issueId),
                    pluginPath: join(process.cwd(), "src", "plugins", "agent"),
                    context,
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
