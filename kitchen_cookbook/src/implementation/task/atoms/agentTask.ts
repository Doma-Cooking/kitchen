import { query, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import { Task } from "../../../interface/task.js";
import { StationEntity } from "kitchen_station";

export interface AgentTaskInput {
    prompt: string;
    workingDirectory: string;
    station?: StationEntity;
}

export type AgentTaskOutput = object;

export const agentTask: Task<AgentTaskInput, AgentTaskOutput> = {
    async execute(input: AgentTaskInput, sendMessage: (message: string) => void, signal?: AbortSignal): Promise<AgentTaskOutput> {
        sendMessage(`Starting agent in ${input.workingDirectory}`);

        const abortController = new AbortController();
        signal?.addEventListener("abort", () => {
            abortController.abort(signal.reason);
        });

        for await (const message of query({
            prompt: input.prompt,
            options: {
                cwd: input.workingDirectory,
                permissionMode: "bypassPermissions",
                allowDangerouslySkipPermissions: true,
                abortController,
            },
        })) {
            handleMessage(message, sendMessage);
        }

        return {};
    }
};

interface ContentBlock {
    type: string;
    text?: string;
}

function handleMessage(message: SDKMessage, sendMessage: (message: string) => void): void {
    switch (message.type) {
        case "assistant": {
            const { content } = message.message as { content: ContentBlock[] };
            for (const block of content) {
                if (block.type === "text" && block.text !== undefined) {
                    sendMessage(block.text);
                }
            }
            break;
        }
        case "result": {
            if (message.subtype === "success") {
                sendMessage(`Agent completed successfully (durationMs: $${message.duration_ms.toString()})`);
            } else {
                throw new Error(`Agent failed (${message.subtype}): ${message.errors.join(", ")}`);
            }
            break;
        }
    }
}
