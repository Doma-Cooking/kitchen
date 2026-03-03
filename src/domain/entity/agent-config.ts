export interface SlackBotConfig {
  appToken: string
  botToken: string
}

export interface AgentConfig {
  id: string                  // agent ID, e.g. "toph" — the yaml key
  displayName: string         // e.g. "Toph"
  agentPrompt: string         // contents of the agent's system prompt markdown file
  pluginPaths: string[]       // resolved absolute paths to plugins
  slack?: SlackBotConfig      // per-agent Slack bot credentials
}
