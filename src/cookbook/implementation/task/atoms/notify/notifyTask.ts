import { WebClient } from "@slack/web-api";
import type { Configuration } from "../../../../../di/configuration.js";
import { Task } from "../../../../interface/task.js";

export interface NotifyTaskInput {
    message: string;
}

export type NotifyTaskOutput = object;

export const notifyTask: Task<NotifyTaskInput, NotifyTaskOutput> = {
    async execute(input: NotifyTaskInput, config: Configuration, sendMessage: (message: string) => void): Promise<NotifyTaskOutput> {
        const token = config.slackBotToken;
        const channel = config.slackChannelId;

        if (!token || !channel) {
            sendMessage("Slack notification skipped: SLACK_BOT_TOKEN or SLACK_CHANNEL_ID not configured");
            return {};
        }

        try {
            const client = new WebClient(token);
            await client.chat.postMessage({
                channel,
                text: input.message,
            });
        } catch (error) {
            sendMessage(`Slack notification failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        return {};
    }
};
