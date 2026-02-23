import { App } from '@slack/bolt';
import type { Event } from './event.js';
import type { EventHandler } from './githubAdapter.js';

export interface SlackAdapterOptions {
    botToken: string;
    appToken: string;
    onEvent: EventHandler;
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
            const slackEvent: Event = {
                source: 'slack',
                sourceId: context.eventId ?? `slack-${Date.now().toString()}`,
                payload: { ...event, eventType },
                timestamp: new Date(Number(event.event_ts) * 1000),
            };

            console.log(`[SlackAdapter] ${eventType} in ${event.channel}`);

            await options.onEvent(slackEvent);
        });
    }

    await app.start();
    console.log('[SlackAdapter] Connected via Socket Mode');
}
