import { join } from "node:path";
import type { Event } from "../../../server/adapters/event.js";
import type { RepoConfig } from "../../../di/configuration.js";
import { Recipe, recipeInputKey } from "../../interface/recipe.js";
import { ExecutableStep } from "../../interface/step.js";
import { agentTask, AgentTaskInput, AgentTaskOutput } from "../task/molecules/agentTask.js";

const recipeId = "resolveOrderRecipe";

export interface ResolveOrderRecipeInput {
    event: Event;
    repos: RepoConfig[];
}

export type ResolveOrderRecipeOutput = object;

export const resolveOrderRecipe = new Recipe<ResolveOrderRecipeInput, ResolveOrderRecipeOutput>(
    recipeId,
    [
        new ExecutableStep<AgentTaskInput, AgentTaskOutput>(
            "resolveAgentStep",
            agentTask,
            (outputs) => {
                const recipeInput = outputs.get(recipeInputKey) as ResolveOrderRecipeInput;
                const event = recipeInput.event;

                const repoLines = recipeInput.repos.length > 0
                    ? recipeInput.repos.map((r) => `- **${r.fullName}**: clone=${r.clonePath}, branch=${r.mainBranch}`).join("\n")
                    : "(none)";

                return {
                    promptId: recipeId,
                    workingDirectory: process.cwd(),
                    pluginPath: join(process.cwd(), "src", "plugins", "resolve"),
                    context: {
                        event_source: event.source,
                        event_source_id: event.sourceId,
                        event_timestamp: event.timestamp instanceof Date
                            ? event.timestamp.toISOString()
                            : String(event.timestamp),
                        event_payload: JSON.stringify(event.payload, null, 2),
                        event_context: event.context ? JSON.stringify(event.context, null, 2) : "{}",
                        repositories: repoLines,
                    },
                };
            }
        ),
    ],
    () => { return {}; },
);
