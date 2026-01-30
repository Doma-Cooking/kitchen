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

        await dependencies.queueOrderUseCase.execute(
            `issue-${String(payload.issue.number)}-comment-${String(payload.comment.id)}`,
            payload.issue.title,
            payload.comment.body,
            undefined,
            `${payload.repository.owner.login}/${payload.repository.name}`
        );
    });

    // PR review (changes requested)
    webhooks.on('pull_request_review.submitted', async ({ payload }) => {
        if (payload.review.state !== 'changes_requested') return;

        await dependencies.queueOrderUseCase.execute(
            `pr-${String(payload.pull_request.number)}-review-${String(payload.review.id)}`,
            payload.pull_request.title,
            payload.review.body ?? 'Changes requested',
            {},
            `${payload.repository.owner.login}/${payload.repository.name}`
        );
    });

    // Inline PR comments
    webhooks.on('pull_request_review_comment.created', async ({ payload }) => {
        if (payload.sender.type === 'Bot') return;

        await dependencies.queueOrderUseCase.execute(
            `pr-${String(payload.pull_request.number)}-comment-${String(payload.comment.id)}`,
            payload.pull_request.title,
            `${payload.comment.path}:${String(payload.comment.line)}\n${payload.comment.body}`,
            {},
            `${payload.repository.owner.login}/${payload.repository.name}`
        );
    });

    webhooks.onError((error) => {
        console.error('GitHub webhook error:', error);
    });

    router.use('/github', createNodeMiddleware(webhooks, { path: '/' }));

    return router;
};

export default createWebhookRoutes;
