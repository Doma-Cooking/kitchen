import { query, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { Configuration } from "../../../../di/configuration.js";
import { Task } from "../../../interface/task.js";
import type { StationEntity } from "../../../../domain/entity/stationEntity.js";
import { agentConfigTask } from "../atoms/agent/agentConfigTask.js";
import { fetchPromptTask } from "../atoms/agent/fetchPromptTask.js";

export interface AgentTaskInput {
    promptId: string;
    workingDirectory: string;
    station?: StationEntity;
    token?: string;
    context?: Record<string, string>;
}

export interface AgentTaskOutput {
    station?: StationEntity;
}

export const agentTask: Task<AgentTaskInput, AgentTaskOutput> = {
    async execute(input: AgentTaskInput, config: Configuration, sendMessage: (message: string) => void, signal?: AbortSignal): Promise<AgentTaskOutput> {
        sendMessage(`Starting agent in ${input.workingDirectory}`);

        const abortController = new AbortController();
        signal?.addEventListener("abort", () => {
            abortController.abort(signal.reason);
        });

        const resume = input.station
            ? new TextDecoder().decode(input.station.contextBytes)
            : undefined;

        let sessionId: string | undefined;

        await agentConfigTask.execute({}, config, sendMessage, signal);
        const { prompt } = await fetchPromptTask.execute({ promptId: input.promptId, context: input.context }, config, sendMessage, signal);

        const appId = config.githubAppId;
        const appSlug = config.githubAppSlug;
        const gitEnv = appId && appSlug ? {
            GIT_AUTHOR_NAME: `${appSlug}[bot]`,
            GIT_AUTHOR_EMAIL: `${appId}+${appSlug}[bot]@users.noreply.github.com`,
            GIT_COMMITTER_NAME: `${appSlug}[bot]`,
            GIT_COMMITTER_EMAIL: `${appId}+${appSlug}[bot]@users.noreply.github.com`,
        } : {};
        const ghEnv = input.token ? { GH_TOKEN: input.token } : {};

        for await (const message of query({
            prompt,
            options: {
                cwd: input.workingDirectory,
                permissionMode: "bypassPermissions",
                allowDangerouslySkipPermissions: true,
                abortController,
                resume,
                model: "claude-opus-4-5-20251101",
                env: { ...process.env, ...gitEnv, ...ghEnv },
                stderr: (data: string) => { sendMessage(`[stderr] ${data}`); }
            },
        })) {
            sessionId = extractSessionId(message) ?? sessionId;
            handleMessage(message, sendMessage);
        }

        return !sessionId ? {} : { station: { contextBytes: new TextEncoder().encode(sessionId) } };
    }
};

interface ContentBlock {
    type: string;
    text?: string;
}

function extractSessionId(message: SDKMessage): string | undefined {
    if ("session_id" in message && typeof message.session_id === "string") {
        return message.session_id;
    }
    return undefined;
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
                sendMessage(`Agent completed successfully (durationMs: ${message.duration_ms.toString()})`);
            } else {
                throw new Error(`Agent failed (${message.subtype}): ${message.errors.join(", ")}`);
            }
            break;
        }
    }
}
