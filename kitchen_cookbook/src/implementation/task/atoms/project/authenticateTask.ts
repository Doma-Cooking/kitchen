import { createAppAuth } from "@octokit/auth-app";
import { Task } from "../../../../interface/task.js";

export type AuthenticateTaskInput = object;

export interface AuthenticateTaskOutput {
    token: string;
    expiresAt: string;
}

export const authenticateTask: Task<AuthenticateTaskInput, AuthenticateTaskOutput> = {
    async execute(_input: AuthenticateTaskInput, sendMessage: (message: string) => void, signal?: AbortSignal): Promise<AuthenticateTaskOutput> {
        const appId = process.env.GITHUB_APP_ID;
        const privateKey = process.env.GITHUB_PRIVATE_KEY;
        const installationId = process.env.GITHUB_INSTALLATION_ID;

        if (!appId) {
            throw new Error("GITHUB_APP_ID environment variable is not set");
        }
        if (!privateKey) {
            throw new Error("GITHUB_PRIVATE_KEY environment variable is not set");
        }
        if (!installationId) {
            throw new Error("GITHUB_INSTALLATION_ID environment variable is not set");
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
