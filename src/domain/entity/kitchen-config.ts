import type { SlackBotConfig, GitHubConfig, LinearConfig, NotionConfig } from './agent-config.js'

export interface RepositoryConfig {
  name: string
  url: string
  description: string
  defaultBranch: string
}

export interface KitchenConfig {
  // Yaml Config
  port: number
  workers: number
  maxTurns: number
  redis: { url: string }
  postgres: { url: string }
  plugins: { path: string }
  lockTtlSeconds: number
  lockRetryIntervalMs: number
  repositories: RepositoryConfig[]
  agents: {
    defaultAgent: string
    team: Record<string, {
      displayName: string;
      agentPrompt: string;
      pluginPaths: string[];
      slack?: SlackBotConfig;
      github?: GitHubConfig;
      linear?: LinearConfig;
      notion?: NotionConfig
    }>
  }

  // Env Config
  apiKey: string
  claudeConfigDir: string
  workspacesPath: string
  snapshotsPath: string
}
