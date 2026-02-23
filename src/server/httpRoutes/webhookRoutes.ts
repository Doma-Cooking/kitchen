import { Router } from 'express';
import { dependencies } from '../../server.js';
import { createGithubAdapter } from '../adapters/githubAdapter.js';
import { startSlackAdapter } from '../adapters/slackAdapter.js';
import { LegacyBridge } from '../adapters/legacyBridge.js';

function createWebhookRoutes(): Router {
  const router = Router();

  const legacyBridge = new LegacyBridge({
    config: dependencies.config,
    queueOrderUseCase: dependencies.queueOrderUseCase,
    resolveProjectItemUseCase: dependencies.resolveProjectItemUseCase,
    resolvePlanningIssueUseCase: dependencies.resolvePlanningIssueUseCase,
    resolveImplementingIssueUseCase: dependencies.resolveImplementingIssueUseCase,
    getRepoConfigUseCase: dependencies.getRepoConfigUseCase,
    githubRepository: dependencies.githubRepository,
  });

  // GitHub adapter (HTTP webhooks)
  const githubRouter = createGithubAdapter(
    dependencies.config.githubWebhookSecret,
    async (event) => {
      await legacyBridge.handle(event);
    }
  );
  router.use('/github', githubRouter);

  // Slack adapter (Socket Mode, runs independently)
  startSlackAdapter({
    botToken: dependencies.config.slackBotToken,
    appToken: dependencies.config.slackAppToken,
    onEvent: async (event) => {
      // Phase 1: Slack events are logged only (no resolver yet)
      await Promise.resolve(); // Simulate async handling
      console.log(`[SlackEvent] ${String(event.payload.eventType)} — sourceId=${event.sourceId}`);
    },
  }).catch((err: unknown) => {
    console.error('Failed to start Slack adapter:', err);
  });

  return router;
};

export default createWebhookRoutes;
