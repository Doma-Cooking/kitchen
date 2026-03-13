import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import type { SlackBotConfig, GitHubConfig, LinearConfig, NotionConfig } from '../../domain/entity/agent-config.js'
import type { KitchenConfig, RepositoryConfig, DocsConfig } from '../../domain/entity/kitchen-config.js'

interface YamlAgentConfig {
  displayName: string
  agentPrompt: string
  pluginPaths: string[]
  slack?: { appTokenEnv?: string; botTokenEnv?: string; userTokenEnv?: string } | boolean
  github?: { tokenEnv?: string; appIdEnv?: string; privateKeyEnv?: string; installationIdEnv?: string } | boolean
  linear?: { clientIdEnv?: string; clientSecretEnv?: string } | boolean
  notion?: { tokenEnv?: string } | boolean
}

interface YamlConfig {
  port: number
  workers: number
  maxTurns: number
  redis: { url: string }
  postgres: { url: string }
  plugins: { path: string }
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
    basePrompt?: string
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

    let basePrompt = yaml.agents.basePrompt
      ? readFileSync(join(yaml.plugins.path, yaml.agents.basePrompt), 'utf8')
      : ''

    if (repositories.length > 0) {
      const rows = repositories.map((r) => `| ${r.name} | ${r.url} | ${r.description} | ${r.defaultBranch} |`).join('\n')
      basePrompt += `\n\n## Repositories\nThe following repositories are available:\n| Name | URL | Description | Default Branch |\n| --- | --- | --- | --- |\n${rows}\n`
    }

    if (docs) {
      const docsPath = join(env.workspacesPath, 'docs')
      basePrompt += `\n\n## Document Store\nDocuments are stored in the GitHub repository ${docs.owner}/${docs.repo}.\nClone the repo to ${docsPath}, write markdown files, and push to the ${docs.branch} branch.\n`
    }

    const resolvedTeam: KitchenConfig['agents']['team'] = {}
    for (const [id, agent] of Object.entries(yaml.agents.team)) {
      const prefix = id.toUpperCase()
      resolvedTeam[id] = {
        displayName: agent.displayName,
        agentPrompt: basePrompt + readFileSync(join(yaml.plugins.path, agent.agentPrompt), 'utf8'),
        pluginPaths: agent.pluginPaths.map((p) => join(yaml.plugins.path, p)),
        slack: this.resolveSlackConfig(agent.slack, prefix),
        github: this.resolveGitHubConfig(agent.github, prefix),
        linear: this.resolveLinearConfig(agent.linear, prefix),
        notion: this.resolveNotionConfig(agent.notion, prefix),
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

  private resolveNotionConfig(notion: YamlAgentConfig['notion'], prefix: string): NotionConfig | undefined {
    const cfg = typeof notion === 'object' ? notion : {}

    const token = process.env[cfg.tokenEnv ?? `${prefix}_NOTION_TOKEN`]
    if (!token) return undefined

    return { token }
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
