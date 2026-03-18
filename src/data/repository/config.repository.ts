import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import type { SlackBotConfig, GitHubConfig, LinearConfig, ScheduleConfig } from '../../domain/entity/agent-config.js'
import type { KitchenConfig, RepositoryConfig, DocsConfig } from '../../domain/entity/kitchen-config.js'
import type { AlertConfig, AlertOverride } from '../../domain/entity/alert-config.js'

interface YamlAgentConfig {
  displayName: string
  agentPrompt: string
  pluginPaths: string[]
  slack?: { appTokenEnv?: string; botTokenEnv?: string; userTokenEnv?: string } | boolean
  github?: { tokenEnv?: string; appIdEnv?: string; privateKeyEnv?: string; installationIdEnv?: string } | boolean
  linear?: { clientIdEnv?: string; clientSecretEnv?: string } | boolean
  schedules?: ScheduleConfig[]
}

interface YamlConfig {
  port: number
  workers: number
  maxTurns: number
  redis: { url: string }
  postgres: { url: string }
  plugins: {
    path: string
    git?: { url: string; branch?: string }
  }
  company?: { name?: string; description?: string }
  lockTtlSeconds?: number
  lockRetryIntervalMs?: number
  repositories?: Array<{
    name: string
    url: string
    description: string
    defaultBranch: string
  }>
  docs?: {
    owner: string
    repo: string
    branch: string
  }
  agents: {
    defaultAgent: string
    team: Record<string, YamlAgentConfig>
  }
  alerting?: {
    channel: string
    schedule: string
    windowHours: number
    minJobs: number
    successRateFloor: number
    overrides?: Array<{ agentId: string; taskType: string; successRateFloor: number }>
  }
}

interface EnvConfig {
  apiKey: string
  claudeConfigDir: string
  workspacesPath: string
  snapshotsPath: string
  adminUsername?: string
  adminPassword?: string
  autoCompactThreshold: string
}

export class ConfigRepository {
  private cachedConfig: KitchenConfig | undefined

  getConfig(): KitchenConfig {
    if (this.cachedConfig !== undefined) {
      return this.cachedConfig
    }

    const yaml = this.loadYamlConfig()
    const env = this.loadEnvConfig()

    const repositories: RepositoryConfig[] = yaml.repositories ?? []
    const docs: DocsConfig | undefined = yaml.docs

    const sections: string[] = []

    if (yaml.company?.name) {
      const description = yaml.company.description ? `\n\n${yaml.company.description}` : ''
      sections.push(`## Company\n\nYou are an AI agent at **${yaml.company.name}**.${description}.`)
    }

    if (repositories.length > 0) {
      const rows = repositories.map((r) => `| ${r.name} | ${r.url} | ${r.description} | ${r.defaultBranch} |`).join('\n')
      sections.push(`## Repositories\nThe following repositories are available:\n| Name | URL | Description | Default Branch |\n| --- | --- | --- | --- |\n${rows}`)
    }

    if (docs) {
      sections.push(`## Document Store\nDocuments are stored in the GitHub repository ${docs.owner}/${docs.repo}.\nClone the repo to docs/ in your workspace, write markdown files, and push to the ${docs.branch} branch.`)
    }

    const baseMdPath = join(yaml.plugins.path, 'agents', 'agents', 'base.md')
    const baseMd = existsSync(baseMdPath) ? readFileSync(baseMdPath, 'utf8').trim() : ''
    if (baseMd) sections.push(baseMd)

    const basePrompt = sections.join('\n\n')

    const resolvedTeam: KitchenConfig['agents']['team'] = {}
    for (const [id, agent] of Object.entries(yaml.agents.team)) {
      const prefix = id.toUpperCase()
      const agentMd = readFileSync(join(yaml.plugins.path, agent.agentPrompt), 'utf8').trim()
      const agentSections = basePrompt ? [basePrompt, agentMd] : [agentMd]
      resolvedTeam[id] = {
        displayName: agent.displayName,
        agentPrompt: agentSections.join('\n\n'),
        pluginPaths: agent.pluginPaths.map((p) => join(yaml.plugins.path, p)),
        slack: this.resolveSlackConfig(agent.slack, prefix),
        github: this.resolveGitHubConfig(agent.github, prefix),
        linear: this.resolveLinearConfig(agent.linear, prefix),
        schedules: agent.schedules,
      }
    }

    const alerting: AlertConfig | undefined = yaml.alerting
      ? {
          channel: yaml.alerting.channel,
          schedule: yaml.alerting.schedule,
          windowHours: yaml.alerting.windowHours,
          minJobs: yaml.alerting.minJobs,
          successRateFloor: yaml.alerting.successRateFloor,
          overrides: (yaml.alerting.overrides ?? []).map<AlertOverride>((o) => ({
            agentId: o.agentId,
            taskType: o.taskType,
            successRateFloor: o.successRateFloor,
          })),
        }
      : undefined

    const defaultSlackBotToken = resolvedTeam[yaml.agents.defaultAgent]?.slack?.botToken

    this.cachedConfig = {
      ...yaml,
      ...env,
      repositories,
      docs,
      alerting,
      defaultSlackBotToken,
      lockTtlSeconds: yaml.lockTtlSeconds ?? 1800,
      lockRetryIntervalMs: yaml.lockRetryIntervalMs ?? 5000,
      agents: { ...yaml.agents, team: resolvedTeam },
    }
    return this.cachedConfig
  }

  private loadYamlConfig(): YamlConfig {
    const raw = readFileSync('.kitchen.yaml', 'utf8')
    return parse(raw) as YamlConfig
  }

  private resolveSlackConfig(slack: YamlAgentConfig['slack'], prefix: string): SlackBotConfig | undefined {
    const cfg = typeof slack === 'object' ? slack : {}

    const appToken = process.env[cfg.appTokenEnv ?? `${prefix}_SLACK_APP_TOKEN`]
    const botToken = process.env[cfg.botTokenEnv ?? `${prefix}_SLACK_BOT_TOKEN`]

    if (!appToken || !botToken) return undefined

    const userToken = process.env[cfg.userTokenEnv ?? `${prefix}_SLACK_USER_TOKEN`]

    return { appToken, botToken, userToken }
  }

  private resolveGitHubConfig(github: YamlAgentConfig['github'], prefix: string): GitHubConfig | undefined {
    const cfg = typeof github === 'object' ? github : {}

    const appId = process.env[cfg.appIdEnv ?? `${prefix}_GITHUB_APP_ID`]
    const privateKey = process.env[cfg.privateKeyEnv ?? `${prefix}_GITHUB_PRIVATE_KEY`]
    const installationId = process.env[cfg.installationIdEnv ?? `${prefix}_GITHUB_INSTALLATION_ID`]

    if (appId && privateKey && installationId) {
      return { mode: 'app', appId, privateKey, installationId }
    }

    const token = process.env[cfg.tokenEnv ?? `${prefix}_GITHUB_TOKEN`]
    if (!token) return undefined

    return { mode: 'pat', token }
  }

  private resolveLinearConfig(linear: YamlAgentConfig['linear'], prefix: string): LinearConfig | undefined {
    const cfg = typeof linear === 'object' ? linear : {}

    const clientId = process.env[cfg.clientIdEnv ?? `${prefix}_LINEAR_CLIENT_ID`]
    const clientSecret = process.env[cfg.clientSecretEnv ?? `${prefix}_LINEAR_CLIENT_SECRET`]
    if (!clientId || !clientSecret) return undefined

    return { clientId, clientSecret }
  }

  private loadEnvConfig(): EnvConfig {
    const apiKey = process.env['ANTHROPIC_API_KEY'] ?? process.env['CLAUDE_CODE_OAUTH_TOKEN']
    if (!apiKey) {
      throw new Error('No API key found. Set ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN.')
    }
    const claudeConfigDir = process.env['CLAUDE_CONFIG_DIR'] ?? '/data/claude'
    const workspacesPath = process.env['WORKSPACES_PATH'] ?? '/data/workspaces'
    const snapshotsPath = process.env['SNAPSHOTS_PATH'] ?? '/data/snapshots'
    const adminUsername = process.env['ADMIN_USERNAME']
    const adminPassword = process.env['ADMIN_PASSWORD']
    const autoCompactThreshold = process.env['AUTO_COMPACT_THRESHOLD'] ?? '60'
    return { apiKey, claudeConfigDir, workspacesPath, snapshotsPath, adminUsername, adminPassword, autoCompactThreshold }
  }
}
