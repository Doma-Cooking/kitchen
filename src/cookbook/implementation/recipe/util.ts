import { createHash } from "crypto";

export type WorkflowStage = "planning" | "implementation" | "agent"

export function stationId(stage: WorkflowStage, repo: string, issueId: string): string {
    return createHash("sha256").update(`${stage}:${repo}:${issueId}`).digest("hex");
}
