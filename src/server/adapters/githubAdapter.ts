import { Router } from 'express';
import { Webhooks, createNodeMiddleware } from '@octokit/webhooks';
import type { Event, EventPayload } from './event.js';
import { ReviewCommentBuffer, type ReviewBatch } from '../httpRoutes/reviewCommentBuffer.js';

export type EventHandler = (event: Event) => Promise<void>;

function emitEvent(sourceId: string, payload: EventPayload, onEvent: EventHandler): Promise<void> {
    const event: Event = {
        source: 'github',
        sourceId,
        payload,
        timestamp: new Date(),
    };
    return onEvent(event);
}

export function createGithubAdapter(
    webhookSecret: string,
    onEvent: EventHandler
): Router {
    const router = Router();
    const webhooks = new Webhooks({ secret: webhookSecret });

    const reviewBuffer = new ReviewCommentBuffer(async (batch: ReviewBatch) => {
        const key = `${batch.owner}/${batch.repo}#${String(batch.prNumber)}`;

        console.log(`[GitHubAdapter] Flushing review batch: ${key} (${String(batch.comments.length)} comments, ${String(batch.reviewBodies.length)} review bodies)`);

        await emitEvent(`review-batch-${key}-${Date.now().toString()}`, {
            eventType: 'pull_request_review_batch',
            owner: batch.owner,
            repo: batch.repo,
            prNumber: batch.prNumber,
            comments: batch.comments,
            reviewBodies: batch.reviewBodies,
        }, onEvent);
    });

    webhooks.on('projects_v2_item.edited', async ({ id, payload }) => {
        console.log(`[GitHubAdapter] Event received: projects_v2_item.edited (${id})`);

        await emitEvent(id, {
            eventType: 'projects_v2_item',
            action: payload.action,
            changes: payload.changes,
            projects_v2_item: {
                content_type: payload.projects_v2_item.content_type,
                content_node_id: payload.projects_v2_item.content_node_id,
                node_id: payload.projects_v2_item.node_id,
                project_node_id: payload.projects_v2_item.project_node_id,
            },
        }, onEvent);
    });

    webhooks.on('issue_comment.created', async ({ id, payload }) => {
        console.log(`[GitHubAdapter] Event received: issue_comment.created (${id})`);

        await emitEvent(id, {
            eventType: 'issue_comment',
            action: payload.action,
            sender: { type: payload.sender.type },
            repository: {
                owner: { login: payload.repository.owner.login },
                name: payload.repository.name,
            },
            issue: {
                pull_request: payload.issue.pull_request,
                number: payload.issue.number,
            },
            comment: {
                id: payload.comment.id,
                body: payload.comment.body,
            },
        }, onEvent);
    });

    // Review events are buffered per PR, then flushed as a single batch Event
    webhooks.on('pull_request_review.submitted', ({ payload }) => {
        if (payload.sender.type === 'Bot') return;
        if (!payload.review.body || payload.review.state === 'approved') return;

        reviewBuffer.addReviewBody(
            payload.repository.owner.login,
            payload.repository.name,
            payload.pull_request.number,
            { body: payload.review.body, reviewId: payload.review.id }
        );
    });

    webhooks.on('pull_request_review_comment.created', ({ payload }) => {
        if (payload.sender.type === 'Bot') return;

        reviewBuffer.addComment(
            payload.repository.owner.login,
            payload.repository.name,
            payload.pull_request.number,
            {
                filePath: payload.comment.path,
                line: payload.comment.line ?? 0,
                body: payload.comment.body,
                commentId: payload.comment.id,
                replyToId: payload.comment.in_reply_to_id ?? payload.comment.id,
            }
        );
    });

    webhooks.onError((error) => {
        console.error('[GitHubAdapter] Webhook error:', error);
    });

    router.use('/', createNodeMiddleware(webhooks, { path: '/' }));

    return router;
}
