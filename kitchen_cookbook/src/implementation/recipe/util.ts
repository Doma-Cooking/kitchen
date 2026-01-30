import { createHash } from "crypto";

export type WorkflowStage = "planning" | "implementation"

export function stationId(stage: WorkflowStage, issueId: string): string {
    return createHash("sha256").update(`${stage}:${issueId}`).digest("hex");
}
