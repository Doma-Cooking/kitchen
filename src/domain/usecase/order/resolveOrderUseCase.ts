import { query } from '@anthropic-ai/claude-agent-sdk';
import type { RepoConfig } from '../../../di/configuration.js';
import type { Event } from '../../../server/adapters/event.js';

export interface ResolveOrderUseCase {
  execute(event: Event): Promise<void>;
}

export interface ResolveOrderConfig {
  pluginPath: string;
  model: string;
  redisHost: string;
  redisPort: number;
  queueName: string;
  repos: RepoConfig[];
}

export class ResolveOrderUseCaseImpl implements ResolveOrderUseCase {
  private config: ResolveOrderConfig;

  constructor(config: ResolveOrderConfig) {
    this.config = config;
  }

  async execute(event: Event): Promise<void> {
    const prompt = this.buildPrompt(event);

    console.log(`[ResolveOrder] Running resolution agent for ${event.source} event: ${event.sourceId}`);

    const conversation = query({
      prompt,
      options: {
        plugins: [{ type: 'local', path: this.config.pluginPath }],
        allowedTools: [
          'mcp__resolve-slack__*',
          'mcp__resolve-github__*',
          'mcp__resolve-queue__*',
          'Skill',
        ],
        settingSources: ['project'],
        model: this.config.model,
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        maxTurns: 10,
        env: {
          ...process.env,
          REDIS_HOST: this.config.redisHost,
          REDIS_PORT: String(this.config.redisPort),
          QUEUE_NAME: this.config.queueName,
        },
      },
    });

    for await (const message of conversation) {
      const msg = message as Record<string, unknown>;
      const type = String(msg.type);
      const subtype = msg.subtype != null ? (msg.subtype as string) : undefined;

      if (type === 'assistant') {
        const content = msg.message as Record<string, unknown> | undefined;
        const text = content ? content.content : undefined;
        console.log(`[ResolveOrder] Assistant message:`, JSON.stringify(text).slice(0, 500));
      } else if (type === 'result') {
        if (subtype !== 'success') {
          console.error(`[ResolveOrder] Agent ended with ${subtype ?? 'unknown'}:`, JSON.stringify(msg).slice(0, 500));
        } else {
          console.log(`[ResolveOrder] Agent completed successfully`);
        }
      } else if (type === 'user') {
        const content = msg.message as Record<string, unknown> | undefined;
        const text = content ? content.content : undefined;
        console.log(`[ResolveOrder] Tool result:`, JSON.stringify(text).slice(0, 500));
      } else {
        console.log(`[ResolveOrder] Message: type=${type}${subtype ? `, subtype=${subtype}` : ''}`);
      }
    }
  }

  private buildPrompt(event: Event): string {
    const parts: string[] = [
      `Resolve the following ${event.source} event into recipe orders.`,
      '',
      `## Event`,
      `- Source: ${event.source}`,
      `- Source ID: ${event.sourceId}`,
      `- Timestamp: ${event.timestamp.toISOString()}`,
      '',
      `## Payload`,
      '```json',
      JSON.stringify(event.payload, null, 2),
      '```',
    ];

    if (event.context) {
      parts.push('', '## Pre-resolved Context', '```json', JSON.stringify(event.context, null, 2), '```');
    }

    if (this.config.repos.length > 0) {
      parts.push('', '## Repositories');
      for (const repo of this.config.repos) {
        parts.push(`- **${repo.fullName}**: clone=${repo.clonePath}, branch=${repo.mainBranch}`);
      }
    }

    parts.push(
      '',
      '## Instructions',
      'IMPORTANT: Your FIRST action MUST be to invoke the Skill tool with skill: "resolve:order-resolution" (from the resolve plugin). This loads the resolution workflow, available recipes, and response requirements. Do NOT skip this step.',
      '',
      'After loading the skill, use it together with the event payload and pre-resolved context to determine which orders to create.',
      'For EACH order you resolve, call the `queue_order` tool to queue it. Do all Slack/GitHub response tool calls as well.',
      'Do NOT output raw JSON as your final message. Use the `queue_order` tool for each order instead.',
    );

    return parts.join('\n');
  }
}
