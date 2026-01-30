import { access, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { Task } from "../../../interface/task.js";

export type AgentAuthTaskInput = object;

export type AgentAuthTaskOutput = object;

const claudeConfigPath = join(homedir(), ".claude.json");

export const agentAuthTask: Task<AgentAuthTaskInput, AgentAuthTaskOutput> = {
    async execute(_input: AgentAuthTaskInput, sendMessage: (message: string) => void): Promise<AgentAuthTaskOutput> {
        const hasOAuthToken = !!process.env.CLAUDE_CODE_OAUTH_TOKEN;

        if (!hasOAuthToken) {
            throw new Error("No Claude authentication configured. Set CLAUDE_CODE_OAUTH_TOKEN.");
        }

        try {
            await access(claudeConfigPath);
            sendMessage("Claude config already exists, skipping auth setup");
        } catch {
            await writeFile(claudeConfigPath, JSON.stringify({ hasCompletedOnboarding: true }));
            sendMessage("Created Claude config with onboarding bypass");
        }

        return {};
    }
};
