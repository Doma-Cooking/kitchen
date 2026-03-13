import type { AgentConfig } from '../../domain/entity/agent-config.js'
import type { ConfigRepository } from './config.repository.js'

export class AgentRepository {
  constructor(private readonly configRepository: ConfigRepository) {}

  getAgentConfig(id: string): AgentConfig | undefined {
    const config = this.configRepository.getConfig()
    const agentEntry = config.agents.team[id]
    if (agentEntry === undefined) {
      return undefined
    }

    return {
      id,
      ...agentEntry,
    }
  }

  getAllAgents(): AgentConfig[] {
    const config = this.configRepository.getConfig()
    return Object.keys(config.agents.team).map((id) => this.getAgentConfig(id) as AgentConfig)
  }
}
