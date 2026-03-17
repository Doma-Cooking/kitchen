import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { parse } from 'yaml'
import type { SlackBotConfig, GitHubConfig, LinearConfig, ScheduleConfig } from '../../domain/entity/agent-config.js'
import type { KitchenConfig, RepositoryConfig, DocsConfig } from '../../domain/entity/kitchen-config.js'

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
}

interface EnvConfig {
  apiKey: string
  claudeConfigDir: string
  workspacesPath: string
  snapshotsPath: string
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

    this.mergePluginSettings(yaml.plugins.path, env.claudeConfigDir)

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

    this.cachedConfig = {
      ...yaml,
      ...env,
      repositories,
      docs,
      lockTtlSeconds: yaml.lockTtlSeconds ?? 1800,
      lockRetryIntervalMs: yaml.lockRetryIntervalMs ?? 5000,
      agents: { ...yaml.agents, team: resolvedTeam },
    }
    return this.cachedConfig
  }

  private mergePluginSettings(pluginPath: string, claudeConfigDir: string): void {
    const pluginSettingsPath = join(pluginPath, 'settings.json')
    if (!existsSync(pluginSettingsPath)) return

    const raw = readFileSync(pluginSettingsPath, 'utf8').replaceAll('${PLUGIN_PATH}', pluginPath)
    const pluginSettings = JSON.parse(raw) as Record<string, unknown>

    const targetPath = join(claudeConfigDir, 'settings.json')
    const existing = existsSync(targetPath)
      ? JSON.parse(readFileSync(targetPath, 'utf8')) as Record<string, unknown>
      : {}

    const merged = this.deepMergeHooks(existing, pluginSettings)
    mkdirSync(dirname(targetPath), { recursive: true })
    writeFileSync(targetPath, JSON.stringify(merged, null, 2))
  }

  private deepMergeHooks(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
  ): Record<string, unknown> {
    const result = { ...target }
    for (const [key, value] of Object.entries(source)) {
      if (Array.isArray(value) && Array.isArray(result[key])) {
        // Merge hook arrays by appending entries not already present (by command)
        const existing = result[key] as Array<{ hooks?: Array<{ command?: string }> }>
        const existingCommands = new Set(existing.flatMap((e) => e.hooks?.map((h) => h.command) ?? []))
        const newEntries = (value as Array<{ hooks?: Array<{ command?: string }> }>).filter(
          (e) => !e.hooks?.every((h) => h.command && existingCommands.has(h.command)),
        )
        result[key] = [...existing, ...newEntries]
      } else if (value !== null && typeof value === 'object' && !Array.isArray(value) && typeof result[key] === 'object' && result[key] !== null) {
        result[key] = this.deepMergeHooks(result[key] as Record<string, unknown>, value as Record<string, unknown>)
      } else {
        result[key] = value
      }
    }
    return result
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
    return { apiKey, claudeConfigDir, workspacesPath, snapshotsPath }
  }
}
