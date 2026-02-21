import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Configuration } from "../../../../../di/configuration.js";
import { Task } from "../../../../interface/task.js";

export type AgentConfigTaskInput = object;

export type AgentConfigTaskOutput = object;

const claudeConfigPath = join(homedir(), ".claude.json");
const claudeSettingsPath = join(homedir(), ".claude", "settings.json");

export const agentConfigTask: Task<AgentConfigTaskInput, AgentConfigTaskOutput> = {
    async execute(_input: AgentConfigTaskInput, config: Configuration, sendMessage: (message: string) => void): Promise<AgentConfigTaskOutput> {
        const hasOAuthToken = !!config.claudeCodeOAuthToken;

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

        // Configure attribution settings
        try {
            await mkdir(join(homedir(), ".claude"), { recursive: true });

            let settings: Record<string, unknown> = {};
            try {
                const existingSettings = await readFile(claudeSettingsPath, "utf-8");
                settings = JSON.parse(existingSettings) as Record<string, unknown>;
            } catch {
                // Settings file doesn't exist, start with empty object
            }

            settings["attribution.commit"] = "";
            settings["attribution.pullRequest"] = "";

            await writeFile(claudeSettingsPath, JSON.stringify(settings, null, 2));
            sendMessage("Configured Claude attribution settings (disabled for commits and PRs)");
        } catch (error) {
            if (error instanceof Error) {
                sendMessage(`Warning: Could not configure attribution settings: ${error.message}`);
            } else {
                sendMessage("Warning: Could not configure attribution settings due to an unknown error");
            }
        }

        return {};
    }
};
