import { createAppAuth } from "@octokit/auth-app";
import type { Configuration } from "../../../../../di/configuration.js";
import { Task } from "../../../../interface/task.js";

export type AuthenticateTaskInput = object;

export interface AuthenticateTaskOutput {
    token: string;
    expiresAt: string;
}

export const authenticateTask: Task<AuthenticateTaskInput, AuthenticateTaskOutput> = {
    async execute(_input: AuthenticateTaskInput, config: Configuration, sendMessage: (message: string) => void, signal?: AbortSignal): Promise<AuthenticateTaskOutput> {
        const appId = config.githubAppId;
        const privateKey = config.githubPrivateKey;
        const installationId = config.githubInstallationId;

        if (!appId) {
            throw new Error("GITHUB_APP_ID is not configured");
        }
        if (!privateKey) {
            throw new Error("GITHUB_PRIVATE_KEY is not configured");
        }
        if (!installationId) {
            throw new Error("GITHUB_INSTALLATION_ID is not configured");
        }

        signal?.throwIfAborted();

        sendMessage("Authenticating as GitHub App installation");

        const auth = createAppAuth({ appId, privateKey: privateKey.replace(/\\n/g, "\n") });
        const { token, expiresAt } = await auth({
            type: "installation",
            installationId: Number(installationId),
        });

        sendMessage("Successfully authenticated");
        return { token, expiresAt };
    }
};
