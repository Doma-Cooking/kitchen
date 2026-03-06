import type { EventTrigger } from './event-trigger.ts'

export interface AgentEvent {
  id: string
  trigger: EventTrigger
  agentId: string
  stationId?: string            // station to resume; defaults to agentId if omitted
  message: string
  timestamp: string           // ISO 8601
}
