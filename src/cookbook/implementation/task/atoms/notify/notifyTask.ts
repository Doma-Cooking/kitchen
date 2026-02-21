import { WebClient } from "@slack/web-api";
import { Task } from "../../../../interface/task.js";

export interface NotifyTaskInput {
    message: string;
}

export type NotifyTaskOutput = object;

export const notifyTask: Task<NotifyTaskInput, NotifyTaskOutput> = {
    async execute(input: NotifyTaskInput, sendMessage: (message: string) => void): Promise<NotifyTaskOutput> {
        const token = process.env.SLACK_BOT_TOKEN;
        const channel = process.env.SLACK_CHANNEL_ID;

        if (!token || !channel) {
            sendMessage("Slack notification skipped: SLACK_BOT_TOKEN or SLACK_CHANNEL_ID not set");
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
