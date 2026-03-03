import type { EventTrigger } from './event-trigger.ts'

export interface AgentEvent {
  id: string
  trigger: EventTrigger
  agentId: string
  message: string
  timestamp: string           // ISO 8601
}
