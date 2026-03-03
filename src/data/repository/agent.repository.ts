import { join } from 'node:path'
import type { AgentConfig } from '../../domain/entity/agent-config.ts'
import type { ConfigRepository } from './config.repository.ts'

export class AgentRepository {
  constructor(private readonly configRepository: ConfigRepository) {}

  getAgentConfig(id: string): AgentConfig | undefined {
    const config = this.configRepository.getConfig()
    const agentEntry = config.agents.team[id]
    if (agentEntry === undefined) {
      return undefined
    }

    const pluginsBase = config.plugins.path
    const pluginPaths = agentEntry.pluginPaths.map((p) => join(pluginsBase, p))

    return {
      id,
      displayName: agentEntry.displayName,
      pluginPaths,
      slack: agentEntry.slack,
    }
  }

  getAllAgents(): AgentConfig[] {
    const config = this.configRepository.getConfig()
    return Object.keys(config.agents.team).map((id) => this.getAgentConfig(id) as AgentConfig)
  }
}
