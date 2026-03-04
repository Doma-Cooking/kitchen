import type { SlackBotConfig, GitHubConfig, LinearConfig } from './agent-config.ts'

export interface KitchenConfig {
  // Yaml Config
  port: number
  workers: number
  redis: { url: string }
  postgres: { url: string }
  plugins: { path: string }
  agents: {
    defaultAgent: string
    team: Record<string, { displayName: string; agentPrompt: string; pluginPaths: string[]; slack?: SlackBotConfig; github?: GitHubConfig; linear?: LinearConfig }>
  }

  // Env Config
  apiKey: string
  claudeConfigDir: string
}
