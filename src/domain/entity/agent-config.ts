import { fileURLToPath } from 'url'

export interface SlackBotConfig {
  signingSecret: string
  botToken: string
  userToken?: string  // xoxp-* token for user-token-only APIs (e.g. search.messages)
}

export type GitHubConfig =
  | { mode: 'pat'; token: string }
  | { mode: 'app'; appId: string; privateKey: string; installationId: string }

export interface LinearConfig {
  clientId: string            // OAuth2 client ID from Linear app settings
  clientSecret: string        // OAuth2 client secret from Linear app settings
}

export interface NotionConfig {
  apiKey: string              // Notion internal integration secret
}

export interface GwsConfig {
  clientId: string            // OAuth2 client ID
  clientSecret: string        // OAuth2 client secret
  refreshToken: string        // OAuth2 refresh token
}

export interface ScheduleConfig {
  cron: string
  skill: string
  name?: string
  stationId?: string
}

export interface AgentConfig {
  id: string                  // agent ID, e.g. "toph" — the yaml key
  displayName: string         // e.g. "Toph"
  agentPrompt: string         // contents of the agent's system prompt markdown file
  pluginPaths: string[]       // resolved absolute paths to plugins
  slack?: SlackBotConfig      // per-agent Slack bot credentials
  github?: GitHubConfig       // per-agent GitHub API credentials
  linear?: LinearConfig       // per-agent Linear API credentials
  notion?: NotionConfig       // per-agent Notion integration credentials
  gws?: GwsConfig             // per-agent Google Workspace credentials
  schedules?: ScheduleConfig[] // per-agent cron schedules
}

export function agentConfigToEnv(agentConfig: AgentConfig): Record<string, string> {
  const env: Record<string, string> = {}
  if (agentConfig.slack) {
    env.SLACK_BOT_TOKEN = agentConfig.slack.botToken
    if (agentConfig.slack.userToken) env.SLACK_USER_TOKEN = agentConfig.slack.userToken
  }
  if (agentConfig.github) {
    if (agentConfig.github.mode === 'app') {
      env.GITHUB_APP_ID = agentConfig.github.appId
      env.GITHUB_PRIVATE_KEY = agentConfig.github.privateKey
      env.GITHUB_INSTALLATION_ID = agentConfig.github.installationId
    } else {
      env.GITHUB_TOKEN = agentConfig.github.token
    }

    // Inject git credential helper via env-based config (no .git/config modification needed)
    const credentialHelperPath = fileURLToPath(
      new URL('../../scripts/git-credential-github-app.js', import.meta.url)
    )
    env.GIT_CONFIG_COUNT = '1'
    env.GIT_CONFIG_KEY_0 = 'credential.helper'
    env.GIT_CONFIG_VALUE_0 = `!node ${credentialHelperPath}`
  }
  if (agentConfig.linear) {
    env.LINEAR_CLIENT_ID = agentConfig.linear.clientId
    env.LINEAR_CLIENT_SECRET = agentConfig.linear.clientSecret
  }
  if (agentConfig.notion) {
    env.NOTION_API_KEY = agentConfig.notion.apiKey
  }
  if (agentConfig.gws) {
    env.GWS_CLIENT_ID = agentConfig.gws.clientId
    env.GWS_CLIENT_SECRET = agentConfig.gws.clientSecret
    env.GWS_REFRESH_TOKEN = agentConfig.gws.refreshToken
  }
  return env
}
