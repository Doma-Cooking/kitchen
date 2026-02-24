import type { BufferedComment, BufferedReviewBody } from '../httpRoutes/reviewCommentBuffer.js';
import type { RepoConfig } from '../../di/configuration.js';
import type { ProjectItemEntity } from '../../domain/entity/projectItemEntity.js';

export interface IssueCommentCreatedPayload {
    eventType: 'issue_comment';
    action: string;
    sender: { type: string };
    repository: { owner: { login: string }; name: string };
    issue: { pull_request?: unknown; number: number };
    comment: { id: number; body: string };
}

export interface ReviewBatchPayload {
    eventType: 'pull_request_review_batch';
    owner: string;
    repo: string;
    prNumber: number;
    comments: BufferedComment[];
    reviewBodies: BufferedReviewBody[];
}

export interface SlackMessagePayload {
    eventType: 'app_mention' | 'message';
    channel: string;
    user?: string;
    text?: string;
    event_ts: string;
}

export type EventPayload =
    | IssueCommentCreatedPayload
    | ReviewBatchPayload
    | SlackMessagePayload;

export interface EventContext {
    repoConfig?: RepoConfig;
    planningItem?: ProjectItemEntity | null;
    implementingItem?: ProjectItemEntity | null;
    feedback?: string;
    prNumber?: number;
    slackThread?: { user?: string; text?: string; ts?: string }[];
    slackChannelInfo?: { id?: string; name?: string; purpose?: string; topic?: string };
    slackRecentMessages?: { user?: string; text?: string; ts?: string; thread_ts?: string }[];
}

export interface Event {
    source: 'github' | 'slack';
    sourceId: string;
    payload: EventPayload;
    timestamp: Date;
    context?: EventContext;
}
