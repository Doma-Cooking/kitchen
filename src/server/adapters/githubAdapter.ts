import { Router } from 'express';
import { Webhooks, createNodeMiddleware } from '@octokit/webhooks';
import type { Event } from './event.js';

export type EventHandler = (event: Event) => Promise<void>;

export function createGithubAdapter(
    webhookSecret: string,
    onEvent: EventHandler
): Router {
    const router = Router();

    const webhooks = new Webhooks({ secret: webhookSecret });

    const githubEventTypes = [
        'projects_v2_item.edited',
        'issue_comment.created',
        'pull_request_review.submitted',
        'pull_request_review_comment.created',
    ] as const;

    for (const eventType of githubEventTypes) {
        webhooks.on(eventType, async ({ id, payload }) => {
            const event: Event = {
                source: 'github',
                sourceId: id,
                payload: { ...payload, eventType: eventType.split('.')[0] },
                timestamp: new Date(),
            };

            console.log(`[GitHubAdapter] Event received: ${eventType} (${id})`);

            await onEvent(event);
        });
    }

    webhooks.onError((error) => {
        console.error('[GitHubAdapter] Webhook error:', error);
    });

    router.use('/', createNodeMiddleware(webhooks, { path: '/' }));

    return router;
}
