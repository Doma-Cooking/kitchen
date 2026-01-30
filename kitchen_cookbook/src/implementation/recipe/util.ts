import { createHash } from "crypto";

export function stationId(recipeId: string, issueId: string): string {
    return createHash("sha256").update(`${recipeId}:${issueId}`).digest("hex");
}
