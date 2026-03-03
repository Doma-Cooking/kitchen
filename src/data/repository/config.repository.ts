import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import type { SlackBotConfig } from '../../domain/entity/agent-config.ts'
import type { KitchenConfig } from '../../domain/entity/kitchen-config.ts'

interface YamlConfig {
  port: number
  workers: number
  redis: { url: string }
  plugins: { path: string }
  agents: {
    defaultAgent: string
    team: Record<string, { displayName: string; agentPrompt: string; pluginPaths: string[]; slack?: { appTokenEnv: string; botTokenEnv: string } }>
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

    const resolvedTeam: KitchenConfig['agents']['team'] = {}
    for (const [id, agent] of Object.entries(yaml.agents.team)) {
      resolvedTeam[id] = {
        displayName: agent.displayName,
        agentPrompt: readFileSync(join(yaml.plugins.path, agent.agentPrompt), 'utf8'),
        pluginPaths: agent.pluginPaths.map((p) => join(yaml.plugins.path, p)),
        slack: this.resolveSlackConfig(agent.slack),
      }
    }

    this.cachedConfig = {
      ...yaml,
      ...env,
      agents: { ...yaml.agents, team: resolvedTeam },
    }
    return this.cachedConfig
  }

  private loadYamlConfig(): YamlConfig {
    const raw = readFileSync('.kitchen.yaml', 'utf8')
    return parse(raw) as YamlConfig
  }

  private resolveSlackConfig(slack?: { appTokenEnv: string; botTokenEnv: string }): SlackBotConfig | undefined {
    if (!slack) return undefined

    const appToken = process.env[slack.appTokenEnv]
    const botToken = process.env[slack.botTokenEnv]

    if (!appToken || !botToken) return undefined

    return { appToken, botToken }
  }

  private loadEnvConfig(): EnvConfig {
    const apiKey = process.env['ANTHROPIC_API_KEY'] ?? process.env['CLAUDE_CODE_OAUTH_TOKEN']
    if (!apiKey) {
      throw new Error('No API key found. Set ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN.')
    }
    return { apiKey }
  }
}
