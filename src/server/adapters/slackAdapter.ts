import { App } from '@slack/bolt';
import type { Event, SlackMessagePayload } from './event.js';
import type { EventHandler } from './githubAdapter.js';
import type { ResolveSlackContextUseCase } from '../../domain/usecase/order/resolve/resolveSlackContextUseCase.js';

export interface SlackAdapterOptions {
    botToken: string;
    appToken: string;
    onEvent: EventHandler;
    resolveSlackContextUseCase: ResolveSlackContextUseCase;
}

const slackEventTypes = ['app_mention', 'message'] as const;

export async function startSlackAdapter(options: SlackAdapterOptions): Promise<void> {
    if (!options.botToken || !options.appToken) {
        console.warn('[SlackAdapter] Missing SLACK_BOT_TOKEN or SLACK_APP_TOKEN, skipping Slack adapter');
        return;
    }

    const app = new App({
        token: options.botToken,
        appToken: options.appToken,
        socketMode: true,
    });

    for (const eventType of slackEventTypes) {
        app.event(eventType, async ({ event, context }) => {
            // Skip bot messages to prevent feedback loops
            if ('bot_id' in event && event.bot_id) {
                return;
            }
            if ('subtype' in event && event.subtype === 'bot_message') {
                return;
            }

            const payload: SlackMessagePayload = {
                eventType,
                channel: event.channel,
                user: 'user' in event ? event.user : undefined,
                text: 'text' in event ? event.text : undefined,
                event_ts: event.event_ts,
            };

            console.log(`[SlackAdapter] ${eventType} in ${event.channel}`);

            const eventContext = await options.resolveSlackContextUseCase.execute(payload);

            const slackEvent: Event = {
                source: 'slack',
                sourceId: (context.eventId as string | undefined) ?? `slack-${Date.now().toString()}`,
                payload,
                timestamp: new Date(Number(event.event_ts) * 1000),
                context: eventContext,
            };

            await options.onEvent(slackEvent);
        });
    }

    await app.start();
    console.log('[SlackAdapter] Connected via Socket Mode');
}
