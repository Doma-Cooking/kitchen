/**
 * Legacy bridge: maps Event objects back to the current queueOrderUseCase.execute() calls.
 * Explicitly temporary — will be replaced by the resolver in Phase 2.
 */

import type { Event, ProjectItemEditedPayload, IssueCommentCreatedPayload, ReviewBatchPayload } from './event.js';
import type { Configuration } from '../../di/configuration.js';
import type { QueueOrderUseCase } from '../../domain/usecase/order/queueOrderUseCase.js';
import type { ResolveProjectItemUseCase } from '../../domain/usecase/github/resolveProjectItemUseCase.js';
import type { ResolvePlanningIssueUseCase } from '../../domain/usecase/github/resolvePlanningIssueUseCase.js';
import type { ResolveImplementingIssueUseCase } from '../../domain/usecase/github/resolveImplementingIssueUseCase.js';
import type { GetRepoConfigUseCase } from '../../domain/usecase/config/getRepoConfigUseCase.js';
import type { GithubRepository } from '../../domain/repository/githubRepository.js';
import { formatBatchedFeedback } from '../httpRoutes/reviewCommentBuffer.js';

export interface LegacyBridgeDeps {
    config: Configuration;
    queueOrderUseCase: QueueOrderUseCase;
    resolveProjectItemUseCase: ResolveProjectItemUseCase;
    resolvePlanningIssueUseCase: ResolvePlanningIssueUseCase;
    resolveImplementingIssueUseCase: ResolveImplementingIssueUseCase;
    getRepoConfigUseCase: GetRepoConfigUseCase;
    githubRepository: GithubRepository;
}

export class LegacyBridge {
    private deps: LegacyBridgeDeps;

    constructor(deps: LegacyBridgeDeps) {
        this.deps = deps;
    }

    async handle(event: Event): Promise<void> {
        if (event.source !== 'github') return;

        const { payload } = event;

        switch (payload.eventType) {
            case 'projects_v2_item':
                await this.handleProjectItemEdited(payload);
                break;
            case 'issue_comment':
                await this.handleIssueCommentCreated(payload);
                break;
            case 'pull_request_review_batch':
                await this.handleReviewBatch(payload);
                break;
        }
    }

    private async handleProjectItemEdited(payload: ProjectItemEditedPayload): Promise<void> {
        const fieldChange = payload.changes?.field_value;
        if (fieldChange?.field_name !== 'Status') return;
        if (payload.projects_v2_item.content_type !== 'Issue') return;

        const contentNodeId = payload.projects_v2_item.content_node_id;
        const itemNodeId = payload.projects_v2_item.node_id;
        if (!contentNodeId || !itemNodeId) return;

        const item = await this.deps.resolveProjectItemUseCase.execute(contentNodeId, itemNodeId);
        if (!item) return;

        const [owner = '', name = ''] = item.repo.split('/');
        const repoConfig = this.deps.getRepoConfigUseCase.execute(owner, name);
        if (!repoConfig) {
            console.warn(`Skipping webhook: no repo configuration found for "${item.repo}"`);
            return;
        }

        if (item.column === this.deps.config.columnPlanning) {
            await this.deps.queueOrderUseCase.execute(
                'domaBeginPlanningRecipe',
                `planning-${item.repo}-${String(item.number)}-${Date.now().toString()}`,
                `Initial Planning: ${item.repo}#${String(item.number)}`,
                {
                    issueId: String(item.number),
                    issueTitle: item.title,
                    repoConfig,
                },
                `planning-${item.repo}-${String(item.number)}`
            );
        }

        if (item.column === this.deps.config.columnReady) {
            const projectNodeId = payload.projects_v2_item.project_node_id;
            const projectInfo = projectNodeId
                ? await this.deps.githubRepository.resolveProjectInfo(projectNodeId)
                : null;

            await this.deps.queueOrderUseCase.execute(
                'domaCreateSubIssuesRecipe',
                `sub-issues-${item.repo}-${String(item.number)}-${Date.now().toString()}`,
                `Create Sub-Issues: ${item.repo}#${String(item.number)}`,
                {
                    issueId: String(item.number),
                    issueTitle: item.title,
                    repoConfig,
                    labelEnabled: this.deps.config.labelEnabled,
                    projectOwner: projectInfo?.owner,
                    projectNumber: projectInfo ? String(projectInfo.number) : undefined,
                    columnReady: this.deps.config.columnReady,
                },
                `planning-${item.repo}-${String(item.number)}`
            );
        }

        if (item.column === this.deps.config.columnImplementing) {
            await this.deps.queueOrderUseCase.execute(
                'domaBeginImplementationRecipe',
                `implementation-${item.repo}-${String(item.number)}-${Date.now().toString()}`,
                `Initial Implementation: ${item.repo}#${String(item.number)}`,
                {
                    issueId: String(item.number),
                    issueTitle: item.title,
                    repoConfig,
                    parentIssueId: item.parentNumber ? String(item.parentNumber) : undefined,
                },
                `implementation-${item.repo}-${String(item.number)}`
            );
        }
    }

    private async handleIssueCommentCreated(payload: IssueCommentCreatedPayload): Promise<void> {
        if (payload.sender.type === 'Bot') return;

        const owner = payload.repository.owner.login;
        const repo = payload.repository.name;
        const fullRepo = `${owner}/${repo}`;

        const repoConfig = this.deps.getRepoConfigUseCase.execute(owner, repo);
        if (!repoConfig) {
            console.warn(`Skipping issue comment: no repo configuration found for "${fullRepo}"`);
            return;
        }

        if (!payload.issue.pull_request) return;

        const planningItem = await this.deps.resolvePlanningIssueUseCase.fromPr(owner, repo, payload.issue.number);
        if (planningItem) {
            const itemRepo = planningItem.repo;
            const issueId = String(planningItem.number);

            await this.deps.queueOrderUseCase.execute(
                'domaFeedbackPlanningRecipe',
                `feedback-${itemRepo}-${issueId}-comment-${String(payload.comment.id)}-${Date.now().toString()}`,
                `Planning Feedback: ${itemRepo}#${issueId}`,
                {
                    issueId,
                    issueTitle: planningItem.title,
                    repoConfig,
                    feedback: payload.comment.body,
                    prNumber: String(payload.issue.number),
                },
                `planning-${itemRepo}-${issueId}`
            );
            return;
        }

        const implementingItem = await this.deps.resolveImplementingIssueUseCase.fromPr(owner, repo, payload.issue.number);
        if (implementingItem) {
            const itemRepo = implementingItem.repo;
            const issueId = String(implementingItem.number);

            await this.deps.queueOrderUseCase.execute(
                'domaFeedbackImplementationRecipe',
                `feedback-${itemRepo}-${issueId}-comment-${String(payload.comment.id)}-${Date.now().toString()}`,
                `Implementation Feedback: ${itemRepo}#${issueId}`,
                {
                    issueId,
                    issueTitle: implementingItem.title,
                    repoConfig,
                    feedback: payload.comment.body,
                    prNumber: String(payload.issue.number),
                },
                `implementation-${itemRepo}-${issueId}`
            );
        }
    }

    private async handleReviewBatch(payload: ReviewBatchPayload): Promise<void> {
        const { owner, repo, prNumber } = payload;
        const fullRepo = `${owner}/${repo}`;

        const repoConfig = this.deps.getRepoConfigUseCase.execute(owner, repo);
        if (!repoConfig) {
            console.warn(`Skipping review batch: no repo configuration found for "${fullRepo}"`);
            return;
        }

        const feedback = formatBatchedFeedback(payload.comments, payload.reviewBodies);

        const planningItem = await this.deps.resolvePlanningIssueUseCase.fromPr(owner, repo, prNumber);
        if (planningItem) {
            const itemRepo = planningItem.repo;
            const issueId = String(planningItem.number);

            await this.deps.queueOrderUseCase.execute(
                'domaFeedbackPlanningRecipe',
                `feedback-${itemRepo}-${issueId}-batch-${Date.now().toString()}`,
                `Planning Feedback: ${itemRepo}#${issueId}`,
                {
                    issueId,
                    issueTitle: planningItem.title,
                    repoConfig,
                    feedback,
                    prNumber: String(prNumber),
                },
                `planning-${itemRepo}-${issueId}`
            );
            return;
        }

        const implementingItem = await this.deps.resolveImplementingIssueUseCase.fromPr(owner, repo, prNumber);
        if (implementingItem) {
            const itemRepo = implementingItem.repo;
            const issueId = String(implementingItem.number);

            await this.deps.queueOrderUseCase.execute(
                'domaFeedbackImplementationRecipe',
                `feedback-${itemRepo}-${issueId}-batch-${Date.now().toString()}`,
                `Implementation Feedback: ${itemRepo}#${issueId}`,
                {
                    issueId,
                    issueTitle: implementingItem.title,
                    repoConfig,
                    feedback,
                    prNumber: String(prNumber),
                },
                `implementation-${itemRepo}-${issueId}`
            );
        }
    }
}
