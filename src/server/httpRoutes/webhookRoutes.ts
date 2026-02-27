import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { dependencies } from '../../server.js';
import { createGithubAdapter } from '../adapters/githubAdapter.js';
import { startSlackAdapter } from '../adapters/slackAdapter.js';
import type { Event } from '../adapters/event.js';

function queueResolveOrder(event: Event): Promise<void> {
  const ts = event.timestamp instanceof Date
    ? event.timestamp.toISOString()
    : String(event.timestamp);

  return dependencies.queueOrderUseCase.execute({
    id: randomUUID(),
    name: `resolve-${event.source}-${event.sourceId}-${ts}`,
    recipeId: 'domaResolveOrderRecipe',
    input: { event, repos: dependencies.config.repos },
  }, dependencies.config.eventQueue.name);
}

function createWebhookRoutes(): Router {
  const router = Router();

  // GitHub adapter (HTTP webhooks)
  const githubRouter = createGithubAdapter(
    dependencies.config.githubWebhookSecret,
    async (event) => {
      await queueResolveOrder(event);
    },
    {
      resolvePlanningIssueUseCase: dependencies.resolvePlanningIssueUseCase,
      resolveImplementingIssueUseCase: dependencies.resolveImplementingIssueUseCase,
      getRepoConfigUseCase: dependencies.getRepoConfigUseCase,
    },
  );
  router.use('/github', githubRouter);

  // Slack adapter (Socket Mode, runs independently)
  startSlackAdapter({
    botToken: dependencies.config.slackBotToken,
    appToken: dependencies.config.slackAppToken,
    resolveSlackContextUseCase: dependencies.resolveSlackContextUseCase,
    onEvent: async (event) => {
      await queueResolveOrder(event);
    },
  }).catch((err: unknown) => {
    console.error('Failed to start Slack adapter:', err);
  });

  return router;
};

export default createWebhookRoutes;
