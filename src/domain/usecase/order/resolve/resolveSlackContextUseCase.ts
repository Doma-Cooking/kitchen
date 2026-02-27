import { WebClient } from '@slack/web-api';
import type { EventContext, SlackMessagePayload } from '../../../../server/adapters/event.js';

export interface ResolveSlackContextUseCase {
    execute(payload: SlackMessagePayload): Promise<EventContext>;
}

export class ResolveSlackContextUseCaseImpl implements ResolveSlackContextUseCase {
    private slack: WebClient;

    constructor(slackBotToken: string) {
        this.slack = new WebClient(slackBotToken);
    }

    async execute(payload: SlackMessagePayload): Promise<EventContext> {
        const context: EventContext = {};
        const { channel, event_ts } = payload;

        try {
            // If this is a threaded message, get thread history
            const threadTs = event_ts;
            if (threadTs) {
                const threadResult = await this.slack.conversations.replies({
                    channel,
                    ts: threadTs,
                    limit: 10,
                });
                context.slackThread = (threadResult.messages ?? []).map(m => ({
                    user: m.user,
                    text: m.text,
                    ts: m.ts,
                }));
            }

            // Get recent channel messages
            const historyResult = await this.slack.conversations.history({
                channel,
                limit: 10,
            });
            context.slackRecentMessages = (historyResult.messages ?? []).map(m => ({
                user: m.user,
                text: m.text,
                ts: m.ts,
                thread_ts: m.thread_ts,
            }));

            // Get channel info
            const infoResult = await this.slack.conversations.info({ channel });
            const ch = infoResult.channel;
            context.slackChannelInfo = {
                id: ch?.id,
                name: ch?.name,
                purpose: ch?.purpose?.value,
                topic: ch?.topic?.value,
            };
        } catch (error) {
            console.error('[ResolveSlackContext] Error fetching Slack context:', error);
        }

        return context;
    }
}
