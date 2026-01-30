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
    });

    // Issue comments (user feedback)
    webhooks.on('issue_comment.created', async ({ payload }) => {
        if (payload.sender.type === 'Bot') return;

        const owner = payload.repository.owner.login;
        const repo = payload.repository.name;

        if (payload.issue.pull_request) {
            const item = await dependencies.resolvePlanningIssueUseCase.fromPr(owner, repo, payload.issue.number);
            if (!item) return;

            const fullRepo = item.repo;
            const issueId = String(item.number);

            await dependencies.queueOrderUseCase.execute(
                'domaFeedbackPlanningRecipe',
                `feedback-${fullRepo}-${issueId}-comment-${String(payload.comment.id)}-${Date.now().toString()}`,
                `Planning Feedback: ${fullRepo}#${issueId}`,
                { issueId, issueTitle: item.title, repo: fullRepo, feedback: payload.comment.body },
                `planning-${fullRepo}-${issueId}`
            );
        } else {
            const item = await dependencies.resolvePlanningIssueUseCase.fromIssue(owner, repo, payload.issue.number);
            if (!item) return;

            const fullRepo = item.repo;
            const issueId = String(item.number);

            await dependencies.queueOrderUseCase.execute(
                'domaFeedbackPlanningRecipe',
                `feedback-${fullRepo}-${issueId}-comment-${String(payload.comment.id)}-${Date.now().toString()}`,
                `Planning Feedback: ${fullRepo}#${issueId}`,
                { issueId, issueTitle: item.title, repo: fullRepo, feedback: payload.comment.body },
                `planning-${fullRepo}-${issueId}`
            );
        }
    });

    // PR review (changes requested)
    webhooks.on('pull_request_review.submitted', async ({ payload }) => {
        if (payload.review.state !== 'changes_requested') return;

        const owner = payload.repository.owner.login;
        const repo = payload.repository.name;

        const item = await dependencies.resolvePlanningIssueUseCase.fromPr(owner, repo, payload.pull_request.number);
        if (!item) return;

        const fullRepo = item.repo;
        const issueId = String(item.number);

        await dependencies.queueOrderUseCase.execute(
            'domaFeedbackPlanningRecipe',
            `feedback-${fullRepo}-${issueId}-review-${String(payload.review.id)}-${Date.now().toString()}`,
            `Planning Feedback: ${fullRepo}#${issueId}`,
            { issueId, issueTitle: item.title, repo: fullRepo, feedback: payload.review.body ?? 'Changes requested' },
            `planning-${fullRepo}-${issueId}`
        );
    });

    // Inline PR comments
    webhooks.on('pull_request_review_comment.created', async ({ payload }) => {
        if (payload.sender.type === 'Bot') return;

        const owner = payload.repository.owner.login;
        const repo = payload.repository.name;

        const item = await dependencies.resolvePlanningIssueUseCase.fromPr(owner, repo, payload.pull_request.number);
        if (!item) return;

        const fullRepo = item.repo;
        const issueId = String(item.number);
        const feedback = `${payload.comment.path}:${String(payload.comment.line)}\n${payload.comment.body}`;

        await dependencies.queueOrderUseCase.execute(
            'domaFeedbackPlanningRecipe',
            `feedback-${fullRepo}-${issueId}-comment-${String(payload.comment.id)}-${Date.now().toString()}`,
            `Planning Feedback: ${fullRepo}#${issueId}`,
            { issueId, issueTitle: item.title, repo: fullRepo, feedback },
            `planning-${fullRepo}-${issueId}`
        );
    });

    webhooks.onError((error) => {
        console.error('GitHub webhook error:', error);
    });

    router.use('/github', createNodeMiddleware(webhooks, { path: '/' }));

    return router;
};

export default createWebhookRoutes;
