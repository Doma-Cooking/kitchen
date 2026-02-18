import { QueueOrderUseCase } from '../../domain/usecase/order/queueOrderUseCase.js';
import { type ResolveStationUseCase, type IssueRefEntity } from 'kitchen_station';

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

function parseOwnerRepo(fullRepo: string): { owner: string; repoName: string } {
    const [owner, repoName] = fullRepo.split('/');
    if (!owner || !repoName) throw new Error(`Invalid repo format: ${fullRepo}`);
    return { owner, repoName };
}

export class ReviewCommentBuffer {
    private buffer = new Map<string, BufferEntry>();
    private debounceMs: number;
    private queueOrderUseCase: QueueOrderUseCase;
    private resolveStationUseCase: ResolveStationUseCase;

    constructor(queueOrderUseCase: QueueOrderUseCase, resolveStationUseCase: ResolveStationUseCase, debounceMs = 5000) {
        this.queueOrderUseCase = queueOrderUseCase;
        this.resolveStationUseCase = resolveStationUseCase;
        this.debounceMs = debounceMs;
    }

    async addComment(
        repo: string,
        issueId: string,
        issueTitle: string,
        prNumber: string,
        comment: BufferedComment
    ): Promise<void> {
        const key = `${repo}-${issueId}`;
        const entry = await this.getOrCreateEntry(key, repo, issueId, issueTitle, prNumber);
        entry.comments.push(comment);
        this.resetTimer(key, entry);
    }

    async addReviewBody(
        repo: string,
        issueId: string,
        issueTitle: string,
        prNumber: string,
        reviewBody: BufferedReviewBody
    ): Promise<void> {
        const key = `${repo}-${issueId}`;
        const entry = await this.getOrCreateEntry(key, repo, issueId, issueTitle, prNumber);
        entry.reviewBody = reviewBody;
        this.resetTimer(key, entry);
    }

    private async getOrCreateEntry(
        key: string,
        repo: string,
        issueId: string,
        issueTitle: string,
        prNumber: string
    ): Promise<BufferEntry> {
        let entry = this.buffer.get(key);
        if (!entry) {
            const { owner, repoName } = parseOwnerRepo(repo);
            const ref: IssueRefEntity = { type: 'issue', owner, repo: repoName, number: parseInt(issueId, 10) };
            const stationId = await this.resolveStationUseCase.execute({ ref });

            entry = {
                recipeId: 'domaFeedbackPlanningRecipe',
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

        await this.queueOrderUseCase.execute(
            entry.recipeId,
            `feedback-${entry.repo}-${entry.issueId}-batch-${Date.now().toString()}`,
            `Feedback: ${entry.repo}#${entry.issueId}`,
            {
                issueId: entry.issueId,
                issueTitle: entry.issueTitle,
                repo: entry.repo,
                feedback,
                prNumber: entry.prNumber,
                stationId: entry.stationId,
            },
            entry.stationId
        );
    }
}
