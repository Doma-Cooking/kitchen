import { Router } from 'express';
import { Webhooks, createNodeMiddleware } from '@octokit/webhooks';
import { dependencies } from '../../server.js';

function createWebhookRoutes(): Router {
    const router = Router();

    const webhooks = new Webhooks({
        secret: dependencies.config.githubWebhookSecret
    });

    // Project board column moves
    webhooks.on('projects_v2_item.edited', ({ payload }) => {
        // Queue order for planning/implementation based on column
        // The payload contains information about the project item movement
        // Implementation depends on how columns are configured
        console.log('Project item edited:', payload.projects_v2_item.id);
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
