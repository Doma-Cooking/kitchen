import type { SlackBotConfig, GitHubConfig, LinearConfig, ScheduleConfig } from './agent-config.js'

export interface RepositoryConfig {
  name: string
  url: string
  description: string
  defaultBranch: string
}

export interface DocsConfig {
  owner: string
  repo: string
  branch: string
}

export interface KitchenConfig {
  // Yaml Config
  port: number
  workers: number
  maxTurns: number
  redis: { url: string }
  postgres: { url: string }
  plugins: { path: string; git?: { url: string; branch?: string } }
  company?: { name?: string; description?: string }
  lockTtlSeconds: number
  lockRetryIntervalMs: number
  repositories: RepositoryConfig[]
  docs?: DocsConfig
  agents: {
    defaultAgent: string
    team: Record<string, {
      displayName: string;
      agentPrompt: string;
      pluginPaths: string[];
      slack?: SlackBotConfig;
      github?: GitHubConfig;
      linear?: LinearConfig;
      schedules?: ScheduleConfig[];
    }>
  }

  // Env Config
  apiKey: string
  claudeConfigDir: string
  workspacesPath: string
  snapshotsPath: string
  adminUsername?: string
  adminPassword?: string
}
