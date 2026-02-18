import { Router } from 'express';
import { Webhooks, createNodeMiddleware } from '@octokit/webhooks';
import { dependencies } from '../../server.js';
import { ReviewCommentBuffer } from './reviewCommentBuffer.js';
import { stationDependencies, type IssueRefEntity } from 'kitchen_station';

function parseOwnerRepo(fullRepo: string): { owner: string; repoName: string } {
    const [owner, repoName] = fullRepo.split('/');
    if (!owner || !repoName) throw new Error(`Invalid repo format: ${fullRepo}`);
    return { owner, repoName };
}

function createWebhookRoutes(): Router {
    const router = Router();

    const webhooks = new Webhooks({
        secret: dependencies.config.githubWebhookSecret
    });

    const reviewBuffer = new ReviewCommentBuffer(dependencies.queueOrderUseCase, stationDependencies.resolveStationUseCase);

    // Project board column moves
    webhooks.on('projects_v2_item.edited', async ({ payload }) => {
        const fieldChange = payload.changes?.field_value;
        if (fieldChange?.field_name !== 'Status') return;
        if (payload.projects_v2_item.content_type !== 'Issue') return;

        const contentNodeId = payload.projects_v2_item.content_node_id;
        const itemNodeId = payload.projects_v2_item.node_id;
        if (!contentNodeId || !itemNodeId) return;

        const item = await dependencies.resolveProjectItemUseCase.execute(
            contentNodeId,
            itemNodeId
        );
        if (!item) return;

        const { owner, repoName } = parseOwnerRepo(item.repo);
        const ref: IssueRefEntity = { type: 'issue', owner, repo: repoName, number: item.number };
        const stationId = await stationDependencies.resolveStationUseCase.execute({ ref });

        if (item.column === dependencies.config.columnPlanning) {
            await dependencies.queueOrderUseCase.execute(
                'domaBeginPlanningRecipe',
                `planning-${item.repo}-${String(item.number)}-${Date.now().toString()}`,
                `Initial Planning: ${item.repo}#${String(item.number)}`,
                { issueId: String(item.number), issueTitle: item.title, repo: item.repo, stationId },
                stationId
            );
        }

        if (item.column === dependencies.config.columnReady) {
            const projectNodeId = payload.projects_v2_item.project_node_id;
            const projectInfo = projectNodeId
                ? await dependencies.githubRepository.resolveProjectInfo(projectNodeId)
                : null;

            await dependencies.queueOrderUseCase.execute(
                'domaCreateSubIssuesRecipe',
                `sub-issues-${item.repo}-${String(item.number)}-${Date.now().toString()}`,
                `Create Sub-Issues: ${item.repo}#${String(item.number)}`,
                {
                    issueId: String(item.number),
                    issueTitle: item.title,
                    repo: item.repo,
                    labelEnabled: dependencies.config.labelEnabled,
                    projectOwner: projectInfo?.owner,
                    projectNumber: projectInfo ? String(projectInfo.number) : undefined,
                    columnReady: dependencies.config.columnReady,
                    stationId,
                },
                stationId
            );
        }

        if (item.column === dependencies.config.columnImplementing) {
            await dependencies.queueOrderUseCase.execute(
                'domaBeginImplementationRecipe',
                `implementation-${item.repo}-${String(item.number)}-${Date.now().toString()}`,
                `Initial Implementation: ${item.repo}#${String(item.number)}`,
                {
                    issueId: String(item.number),
                    issueTitle: item.title,
                    repo: item.repo,
                    parentIssueId: item.parentNumber ? String(item.parentNumber) : undefined,
                    stationId,
                },
                stationId
            );
        }
    });

    // Issue comments (user feedback)
    webhooks.on('issue_comment.created', async ({ payload }) => {
        if (payload.sender.type === 'Bot') return;

        const owner = payload.repository.owner.login;
        const repo = payload.repository.name;

        if (!payload.issue.pull_request) return;

        const planningItem = await dependencies.resolvePlanningIssueUseCase.fromPr(owner, repo, payload.issue.number);
        if (planningItem) {
            const { owner: itemOwner, repoName } = parseOwnerRepo(planningItem.repo);
            const ref: IssueRefEntity = { type: 'issue', owner: itemOwner, repo: repoName, number: planningItem.number };
            const stationId = await stationDependencies.resolveStationUseCase.execute({ ref });
            const issueId = String(planningItem.number);

            await dependencies.queueOrderUseCase.execute(
                'domaFeedbackPlanningRecipe',
                `feedback-${planningItem.repo}-${issueId}-comment-${String(payload.comment.id)}-${Date.now().toString()}`,
                `Planning Feedback: ${planningItem.repo}#${issueId}`,
                { issueId, issueTitle: planningItem.title, repo: planningItem.repo, feedback: payload.comment.body, prNumber: String(payload.issue.number), stationId },
                stationId
            );
            return;
        }

        const implementingItem = await dependencies.resolveImplementingIssueUseCase.fromPr(owner, repo, payload.issue.number);
        if (implementingItem) {
            const { owner: itemOwner, repoName } = parseOwnerRepo(implementingItem.repo);
            const ref: IssueRefEntity = { type: 'issue', owner: itemOwner, repo: repoName, number: implementingItem.number };
            const stationId = await stationDependencies.resolveStationUseCase.execute({ ref });
            const issueId = String(implementingItem.number);

            await dependencies.queueOrderUseCase.execute(
                'domaFeedbackImplementationRecipe',
                `feedback-${implementingItem.repo}-${issueId}-comment-${String(payload.comment.id)}-${Date.now().toString()}`,
                `Implementation Feedback: ${implementingItem.repo}#${issueId}`,
                { issueId, issueTitle: implementingItem.title, repo: implementingItem.repo, feedback: payload.comment.body, prNumber: String(payload.issue.number), stationId },
                stationId
            );
        }
    });

    // PR review
    webhooks.on('pull_request_review.submitted', async ({ payload }) => {
        if (payload.sender.type === 'Bot') return;
        if (!payload.review.body || payload.review.state === 'approved') return;

        const owner = payload.repository.owner.login;
        const repo = payload.repository.name;

        const planningItem = await dependencies.resolvePlanningIssueUseCase.fromPr(owner, repo, payload.pull_request.number);
        if (planningItem) {
            await reviewBuffer.addReviewBody(
                planningItem.repo,
                String(planningItem.number),
                planningItem.title,
                String(payload.pull_request.number),
                { body: payload.review.body, reviewId: payload.review.id }
            );
            return;
        }

        const implementingItem = await dependencies.resolveImplementingIssueUseCase.fromPr(owner, repo, payload.pull_request.number);
        if (implementingItem) {
            await reviewBuffer.addReviewBody(
                implementingItem.repo,
                String(implementingItem.number),
                implementingItem.title,
                String(payload.pull_request.number),
                { body: payload.review.body, reviewId: payload.review.id }
            );
        }
    });

    // Inline PR comments
    webhooks.on('pull_request_review_comment.created', async ({ payload }) => {
        if (payload.sender.type === 'Bot') return;

        const owner = payload.repository.owner.login;
        const repo = payload.repository.name;

        const comment = {
            filePath: payload.comment.path,
            line: payload.comment.line ?? 0,
            body: payload.comment.body,
            commentId: payload.comment.id,
            replyToId: payload.comment.in_reply_to_id ?? payload.comment.id
        };

        const planningItem = await dependencies.resolvePlanningIssueUseCase.fromPr(owner, repo, payload.pull_request.number);
        if (planningItem) {
            await reviewBuffer.addComment(
                planningItem.repo,
                String(planningItem.number),
                planningItem.title,
                String(payload.pull_request.number),
                comment
            );
            return;
        }

        const implementingItem = await dependencies.resolveImplementingIssueUseCase.fromPr(owner, repo, payload.pull_request.number);
        if (implementingItem) {
            await reviewBuffer.addComment(
                implementingItem.repo,
                String(implementingItem.number),
                implementingItem.title,
                String(payload.pull_request.number),
                comment
            );
        }
    });

    webhooks.onError((error) => {
        console.error('GitHub webhook error:', error);
    });

    router.use('/github', createNodeMiddleware(webhooks, { path: '/' }));

    return router;
};

export default createWebhookRoutes;
