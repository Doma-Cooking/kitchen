import type { SlackBotConfig } from './agent-config.ts'

export interface KitchenConfig {
  // Yaml Config
  port: number
  workers: number
  redis: { url: string }
  plugins: { path: string }
  agents: {
    defaultAgent: string
    team: Record<string, { displayName: string; pluginPaths: string[]; slack?: SlackBotConfig }>
  }

  // Env Config
  apiKey: string
}
