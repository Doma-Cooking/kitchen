import type { BufferedComment, BufferedReviewBody } from '../httpRoutes/reviewCommentBuffer.js';

export interface ProjectItemEditedPayload {
    eventType: 'projects_v2_item';
    action: string;
    changes?: { field_value?: { field_name?: string } };
    projects_v2_item: {
        content_type: string;
        content_node_id: string;
        node_id: string | undefined;
        project_node_id?: string;
    };
}

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
    | ProjectItemEditedPayload
    | IssueCommentCreatedPayload
    | ReviewBatchPayload
    | SlackMessagePayload;

export interface Event {
    source: 'github' | 'slack';
    sourceId: string;
    payload: EventPayload;
    timestamp: Date;
}
