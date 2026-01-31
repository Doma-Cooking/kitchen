import { Router } from 'express';
import { Webhooks, createNodeMiddleware } from '@octokit/webhooks';
import { dependencies } from '../../server.js';

function createWebhookRoutes(): Router {
    const router = Router();

    const webhooks = new Webhooks({
        secret: dependencies.config.githubWebhookSecret
    });

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

        if (item.column === dependencies.config.columnPlanning) {
            await dependencies.queueOrderUseCase.execute(
                'domaBeginPlanningRecipe',
                `planning-${item.repo}-${String(item.number)}-${Date.now().toString()}`,
                `Initial Planning: ${item.repo}#${String(item.number)}`,
                { issueId: String(item.number), issueTitle: item.title, repo: item.repo },
                `planning-${item.repo}-${String(item.number)}`
            );
        }

        if (item.column === dependencies.config.columnImplementing) {
            await dependencies.queueOrderUseCase.execute(
                'domaBeginImplementationRecipe',
                `implementation-${item.repo}-${String(item.number)}-${Date.now().toString()}`,
                `Initial Implementation: ${item.repo}#${String(item.number)}`,
                { issueId: String(item.number), issueTitle: item.title, repo: item.repo },
                `implementation-${item.repo}-${String(item.number)}`
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
            const fullRepo = planningItem.repo;
            const issueId = String(planningItem.number);

            await dependencies.queueOrderUseCase.execute(
                'domaFeedbackPlanningRecipe',
                `feedback-${fullRepo}-${issueId}-comment-${String(payload.comment.id)}-${Date.now().toString()}`,
                `Planning Feedback: ${fullRepo}#${issueId}`,
                { issueId, issueTitle: planningItem.title, repo: fullRepo, feedback: payload.comment.body, prNumber: String(payload.issue.number) },
                `planning-${fullRepo}-${issueId}`
            );
            return;
        }

        const implementingItem = await dependencies.resolveImplementingIssueUseCase.fromPr(owner, repo, payload.issue.number);
        if (implementingItem) {
            const fullRepo = implementingItem.repo;
            const issueId = String(implementingItem.number);

            await dependencies.queueOrderUseCase.execute(
                'domaFeedbackImplementationRecipe',
                `feedback-${fullRepo}-${issueId}-comment-${String(payload.comment.id)}-${Date.now().toString()}`,
                `Implementation Feedback: ${fullRepo}#${issueId}`,
                { issueId, issueTitle: implementingItem.title, repo: fullRepo, feedback: payload.comment.body, prNumber: String(payload.issue.number) },
                `implementation-${fullRepo}-${issueId}`
            );
        }
    });

    // PR review
    webhooks.on('pull_request_review.submitted', async ({ payload }) => {
        if (!payload.review.body || payload.review.state === 'approved') return;

        const owner = payload.repository.owner.login;
        const repo = payload.repository.name;

        const planningItem = await dependencies.resolvePlanningIssueUseCase.fromPr(owner, repo, payload.pull_request.number);
        if (planningItem) {
            const fullRepo = planningItem.repo;
            const issueId = String(planningItem.number);

            await dependencies.queueOrderUseCase.execute(
                'domaFeedbackPlanningRecipe',
                `feedback-${fullRepo}-${issueId}-review-${String(payload.review.id)}-${Date.now().toString()}`,
                `Planning Feedback: ${fullRepo}#${issueId}`,
                { issueId, issueTitle: planningItem.title, repo: fullRepo, feedback: payload.review.body, prNumber: String(payload.pull_request.number) },
                `planning-${fullRepo}-${issueId}`
            );
            return;
        }

        const implementingItem = await dependencies.resolveImplementingIssueUseCase.fromPr(owner, repo, payload.pull_request.number);
        if (implementingItem) {
            const fullRepo = implementingItem.repo;
            const issueId = String(implementingItem.number);

            await dependencies.queueOrderUseCase.execute(
                'domaFeedbackImplementationRecipe',
                `feedback-${fullRepo}-${issueId}-review-${String(payload.review.id)}-${Date.now().toString()}`,
                `Implementation Feedback: ${fullRepo}#${issueId}`,
                { issueId, issueTitle: implementingItem.title, repo: fullRepo, feedback: payload.review.body, prNumber: String(payload.pull_request.number) },
                `implementation-${fullRepo}-${issueId}`
            );
        }
    });

    // Inline PR comments
    webhooks.on('pull_request_review_comment.created', async ({ payload }) => {
        if (payload.sender.type === 'Bot') return;

        const owner = payload.repository.owner.login;
        const repo = payload.repository.name;

        const planningItem = await dependencies.resolvePlanningIssueUseCase.fromPr(owner, repo, payload.pull_request.number);
        if (planningItem) {
            const fullRepo = planningItem.repo;
            const issueId = String(planningItem.number);
            const feedback = `${payload.comment.path}:${String(payload.comment.line)}\n${payload.comment.body}`;

            await dependencies.queueOrderUseCase.execute(
                'domaFeedbackPlanningRecipe',
                `feedback-${fullRepo}-${issueId}-comment-${String(payload.comment.id)}-${Date.now().toString()}`,
                `Planning Feedback: ${fullRepo}#${issueId}`,
                { issueId, issueTitle: planningItem.title, repo: fullRepo, feedback, replyTo: String(payload.comment.in_reply_to_id ?? payload.comment.id), prNumber: String(payload.pull_request.number) },
                `planning-${fullRepo}-${issueId}`
            );
            return;
        }

        const implementingItem = await dependencies.resolveImplementingIssueUseCase.fromPr(owner, repo, payload.pull_request.number);
        if (implementingItem) {
            const fullRepo = implementingItem.repo;
            const issueId = String(implementingItem.number);
            const feedback = `${payload.comment.path}:${String(payload.comment.line)}\n${payload.comment.body}`;

            await dependencies.queueOrderUseCase.execute(
                'domaFeedbackImplementationRecipe',
                `feedback-${fullRepo}-${issueId}-comment-${String(payload.comment.id)}-${Date.now().toString()}`,
                `Implementation Feedback: ${fullRepo}#${issueId}`,
                { issueId, issueTitle: implementingItem.title, repo: fullRepo, feedback, replyTo: String(payload.comment.in_reply_to_id ?? payload.comment.id), prNumber: String(payload.pull_request.number) },
                `implementation-${fullRepo}-${issueId}`
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
