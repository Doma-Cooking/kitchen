import { readFileSync } from 'node:fs'
import { parse } from 'yaml'
import type { KitchenConfig } from '../../domain/entity/kitchen-config.ts'

interface YamlConfig {
  port: number
  workers: number
  redis: { url: string }
  plugins: { path: string }
  agents: {
    defaultAgent: string
    team: Record<string, { displayName: string; pluginPaths: string[] }>
  }
}

interface EnvConfig {
  apiKey: string
}

export class ConfigRepository {
  private cachedConfig: KitchenConfig | undefined

  getConfig(): KitchenConfig {
    if (this.cachedConfig !== undefined) {
      return this.cachedConfig
    }

    const yaml = this.loadYamlConfig()
    const env = this.loadEnvConfig()

    this.cachedConfig = { ...yaml, ...env }
    return this.cachedConfig
  }

  private loadYamlConfig(): YamlConfig {
    const raw = readFileSync('.kitchen.yaml', 'utf8')
    return parse(raw) as YamlConfig
  }

  private loadEnvConfig(): EnvConfig {
    const apiKey = process.env['ANTHROPIC_API_KEY'] ?? process.env['CLAUDE_CODE_OAUTH_TOKEN']
    if (!apiKey) {
      throw new Error('No API key found. Set ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN.')
    }
    return { apiKey }
  }
}
