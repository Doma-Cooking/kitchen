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

export interface ReviewBatch {
    owner: string;
    repo: string;
    prNumber: number;
    comments: BufferedComment[];
    reviewBodies: BufferedReviewBody[];
}

interface BufferEntry {
    owner: string;
    repo: string;
    prNumber: number;
    comments: BufferedComment[];
    reviewBodies: BufferedReviewBody[];
    timer: ReturnType<typeof setTimeout>;
}

export function formatBatchedFeedback(
    comments: BufferedComment[],
    reviewBodies: BufferedReviewBody[]
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

    for (const reviewBody of reviewBodies) {
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
    private onFlush: (batch: ReviewBatch) => Promise<void>;

    constructor(onFlush: (batch: ReviewBatch) => Promise<void>, debounceMs = 5000) {
        this.onFlush = onFlush;
        this.debounceMs = debounceMs;
    }

    addComment(
        owner: string,
        repo: string,
        prNumber: number,
        comment: BufferedComment
    ): void {
        const key = `${owner}/${repo}#${String(prNumber)}`;
        const entry = this.getOrCreateEntry(key, owner, repo, prNumber);
        entry.comments.push(comment);
        this.resetTimer(key, entry);
    }

    addReviewBody(
        owner: string,
        repo: string,
        prNumber: number,
        reviewBody: BufferedReviewBody
    ): void {
        const key = `${owner}/${repo}#${String(prNumber)}`;
        const entry = this.getOrCreateEntry(key, owner, repo, prNumber);
        entry.reviewBodies.push(reviewBody);
        this.resetTimer(key, entry);
    }

    private getOrCreateEntry(
        key: string,
        owner: string,
        repo: string,
        prNumber: number
    ): BufferEntry {
        let entry = this.buffer.get(key);
        if (!entry) {
            entry = {
                owner,
                repo,
                prNumber,
                comments: [],
                reviewBodies: [],
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

        await this.onFlush({
            owner: entry.owner,
            repo: entry.repo,
            prNumber: entry.prNumber,
            comments: entry.comments,
            reviewBodies: entry.reviewBodies,
        });
    }
}
