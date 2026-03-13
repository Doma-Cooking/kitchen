import type { AgentEvent } from '../entity/agent-event.js'
import type { AgentRepository } from '../../data/repository/agent.repository.js'
import type { EventRepository } from '../../data/repository/event.repository.js'

export class HandleEventUseCase {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly eventRepository: EventRepository,
  ) {}

  async execute(event: AgentEvent): Promise<string> {
    if (event.agentId) {
      const agentConfig = this.agentRepository.getAgentConfig(event.agentId)
      if (agentConfig === undefined) {
        throw new Error(`Agent not found: ${event.agentId}`)
      }
    }

    const eventId = await this.eventRepository.enqueueEvent(event)
    return eventId
  }
}
