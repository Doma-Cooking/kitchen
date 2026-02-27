import { Router } from 'express';
import { Webhooks, createNodeMiddleware } from '@octokit/webhooks';
import type { Event, EventPayload, EventContext } from './event.js';
import { ReviewCommentBuffer, type ReviewBatch } from '../httpRoutes/reviewCommentBuffer.js';
import { formatBatchedFeedback } from '../httpRoutes/reviewCommentBuffer.js';
import type { ResolvePlanningIssueUseCase } from '../../domain/usecase/order/resolve/resolvePlanningIssueUseCase.js';
import type { ResolveImplementingIssueUseCase } from '../../domain/usecase/order/resolve/resolveImplementingIssueUseCase.js';
import type { GetRepoConfigUseCase } from '../../domain/usecase/config/getRepoConfigUseCase.js';

export type EventHandler = (event: Event) => Promise<void>;

export interface GithubAdapterDeps {
    resolvePlanningIssueUseCase: ResolvePlanningIssueUseCase;
    resolveImplementingIssueUseCase: ResolveImplementingIssueUseCase;
    getRepoConfigUseCase: GetRepoConfigUseCase;
}

async function enrichGithubEvent(
    payload: EventPayload,
    deps: GithubAdapterDeps,
): Promise<EventContext> {
    const context: EventContext = {};

    if (payload.eventType === 'issue_comment' && payload.issue.pull_request) {
        const owner = payload.repository.owner.login;
        const repo = payload.repository.name;

        context.repoConfig = deps.getRepoConfigUseCase.execute(owner, repo);
        context.prNumber = payload.issue.number;
        context.feedback = payload.comment.body;

        const [planningItem, implementingItem] = await Promise.all([
            deps.resolvePlanningIssueUseCase.fromPr(owner, repo, payload.issue.number),
            deps.resolveImplementingIssueUseCase.fromPr(owner, repo, payload.issue.number),
        ]);

        context.planningItem = planningItem;
        context.implementingItem = implementingItem;
    }

    if (payload.eventType === 'pull_request_review_batch') {
        const { owner, repo, prNumber, comments, reviewBodies } = payload;
        context.repoConfig = deps.getRepoConfigUseCase.execute(owner, repo);
        context.prNumber = prNumber;
        context.feedback = formatBatchedFeedback(comments, reviewBodies);

        const [planningItem, implementingItem] = await Promise.all([
            deps.resolvePlanningIssueUseCase.fromPr(owner, repo, prNumber),
            deps.resolveImplementingIssueUseCase.fromPr(owner, repo, prNumber),
        ]);

        context.planningItem = planningItem;
        context.implementingItem = implementingItem;
    }

    return context;
}

function emitEvent(
    sourceId: string,
    payload: EventPayload,
    onEvent: EventHandler,
    context?: EventContext,
): Promise<void> {
    const event: Event = {
        source: 'github',
        sourceId,
        payload,
        timestamp: new Date(),
        context,
    };
    return onEvent(event);
}

export function createGithubAdapter(
    webhookSecret: string,
    onEvent: EventHandler,
    deps: GithubAdapterDeps,
): Router {
    const router = Router();
    const webhooks = new Webhooks({ secret: webhookSecret });

    const reviewBuffer = new ReviewCommentBuffer(async (batch: ReviewBatch) => {
        const key = `${batch.owner}/${batch.repo}#${String(batch.prNumber)}`;

        console.log(`[GitHubAdapter] Flushing review batch: ${key} (${String(batch.comments.length)} comments, ${String(batch.reviewBodies.length)} review bodies)`);

        const payload: EventPayload = {
            eventType: 'pull_request_review_batch',
            owner: batch.owner,
            repo: batch.repo,
            prNumber: batch.prNumber,
            comments: batch.comments,
            reviewBodies: batch.reviewBodies,
        };

        const context = await enrichGithubEvent(payload, deps);
        await emitEvent(`review-batch-${key}-${Date.now().toString()}`, payload, onEvent, context);
    });

    webhooks.on('issue_comment.created', async ({ id, payload }) => {
        console.log(`[GitHubAdapter] Event received: issue_comment.created (${id})`);

        const eventPayload: EventPayload = {
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
        };

        const context = await enrichGithubEvent(eventPayload, deps);
        await emitEvent(id, eventPayload, onEvent, context);
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
