import { Router } from 'express';
import { dependencies } from '../../server.js';
import { createGithubAdapter } from '../adapters/githubAdapter.js';
import { startSlackAdapter } from '../adapters/slackAdapter.js';

function createWebhookRoutes(): Router {
  const router = Router();

  // GitHub adapter (HTTP webhooks)
  const githubRouter = createGithubAdapter(
    dependencies.config.githubWebhookSecret,
    async (event) => {
      await dependencies.resolveOrderUseCase.execute(event);
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
      await dependencies.resolveOrderUseCase.execute(event);
    },
  }).catch((err: unknown) => {
    console.error('Failed to start Slack adapter:', err);
  });

  return router;
};

export default createWebhookRoutes;
