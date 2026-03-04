export interface SlackBotConfig {
  appToken: string
  botToken: string
}

export type GitHubConfig =
  | { mode: 'pat'; token: string }
  | { mode: 'app'; appId: string; privateKey: string; installationId: string }

export interface LinearConfig {
  clientId: string            // OAuth2 client ID from Linear app settings
  clientSecret: string        // OAuth2 client secret from Linear app settings
}

export interface AgentConfig {
  id: string                  // agent ID, e.g. "toph" — the yaml key
  displayName: string         // e.g. "Toph"
  agentPrompt: string         // contents of the agent's system prompt markdown file
  pluginPaths: string[]       // resolved absolute paths to plugins
  slack?: SlackBotConfig      // per-agent Slack bot credentials
  github?: GitHubConfig       // per-agent GitHub API credentials
  linear?: LinearConfig       // per-agent Linear API credentials
}
