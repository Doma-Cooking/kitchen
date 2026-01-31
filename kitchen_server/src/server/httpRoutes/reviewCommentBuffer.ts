import { QueueOrderUseCase } from '../../domain/usecase/order/queueOrderUseCase.js';

export interface BufferedComment {
    filePath: string;
    line: number;
    body: string;
    commentId: number;
    replyToId: number;
}

export interface BufferedReviewBody {
    body: string;
    reviewId: number;
}

interface BufferEntry {
    phase: 'planning' | 'implementation';
    recipeId: string;
    issueId: string;
    issueTitle: string;
    repo: string;
    prNumber: string;
    stationId: string;
    comments: BufferedComment[];
    reviewBody: BufferedReviewBody | null;
    timer: ReturnType<typeof setTimeout>;
}

export function formatBatchedFeedback(
    comments: BufferedComment[],
    reviewBody: BufferedReviewBody | null
): string {
    const parts: string[] = [];

    comments.forEach((comment, index) => {
        parts.push(
            `### Review Comment ${String(index + 1)}\n` +
            `**File:** \`${comment.filePath}\`, **Line:** ${String(comment.line)}\n` +
            `**Comment ID:** ${String(comment.replyToId)} (reply to this thread)\n\n` +
            comment.body
        );
    });

    if (reviewBody) {
        parts.push(
            `### Review Body\n\n` +
            reviewBody.body
        );
    }

    return parts.join('\n\n---\n\n');
}

export class ReviewCommentBuffer {
    private buffer = new Map<string, BufferEntry>();
    private debounceMs: number;
    private queueOrderUseCase: QueueOrderUseCase;

    constructor(queueOrderUseCase: QueueOrderUseCase, debounceMs = 5000) {
        this.queueOrderUseCase = queueOrderUseCase;
        this.debounceMs = debounceMs;
    }

    addComment(
        phase: 'planning' | 'implementation',
        repo: string,
        issueId: string,
        issueTitle: string,
        prNumber: string,
        comment: BufferedComment
    ): void {
        const key = `${phase}-${repo}-${issueId}`;
        const entry = this.getOrCreateEntry(key, phase, repo, issueId, issueTitle, prNumber);
        entry.comments.push(comment);
        this.resetTimer(key, entry);
    }

    addReviewBody(
        phase: 'planning' | 'implementation',
        repo: string,
        issueId: string,
        issueTitle: string,
        prNumber: string,
        reviewBody: BufferedReviewBody
    ): void {
        const key = `${phase}-${repo}-${issueId}`;
        const entry = this.getOrCreateEntry(key, phase, repo, issueId, issueTitle, prNumber);
        entry.reviewBody = reviewBody;
        this.resetTimer(key, entry);
    }

    private getOrCreateEntry(
        key: string,
        phase: 'planning' | 'implementation',
        repo: string,
        issueId: string,
        issueTitle: string,
        prNumber: string
    ): BufferEntry {
        let entry = this.buffer.get(key);
        if (!entry) {
            const recipeId = phase === 'planning'
                ? 'domaFeedbackPlanningRecipe'
                : 'domaFeedbackImplementationRecipe';
            const stationId = phase === 'planning'
                ? `planning-${repo}-${issueId}`
                : `implementation-${repo}-${issueId}`;
            entry = {
                phase,
                recipeId,
                issueId,
                issueTitle,
                repo,
                prNumber,
                stationId,
                comments: [],
                reviewBody: null,
                timer: setTimeout(() => { void this.flush(key); }, this.debounceMs)
            };
            this.buffer.set(key, entry);
        }
        return entry;
    }

    private resetTimer(key: string, entry: BufferEntry): void {
        clearTimeout(entry.timer);
        entry.timer = setTimeout(() => { void this.flush(key); }, this.debounceMs);
    }

    private async flush(key: string): Promise<void> {
        const entry = this.buffer.get(key);
        if (!entry) return;
        this.buffer.delete(key);

        const feedback = formatBatchedFeedback(entry.comments, entry.reviewBody);
        const label = entry.phase === 'planning' ? 'Planning' : 'Implementation';

        await this.queueOrderUseCase.execute(
            entry.recipeId,
            `feedback-${entry.repo}-${entry.issueId}-batch-${Date.now().toString()}`,
            `${label} Feedback: ${entry.repo}#${entry.issueId}`,
            {
                issueId: entry.issueId,
                issueTitle: entry.issueTitle,
                repo: entry.repo,
                feedback,
                prNumber: entry.prNumber
            },
            entry.stationId
        );
    }
}
