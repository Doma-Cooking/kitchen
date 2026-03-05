import type { AgentEvent } from './agent-event.ts'

export type LockKeyResolver = (event: AgentEvent, defaultAgentId: string) => string[]

export const defaultLockKeyResolver: LockKeyResolver = (event, defaultAgentId) => {
  const memoryId = event.memoryId ?? (event.agentId || defaultAgentId)
  return [`kitchen:lock:memory:${memoryId}`]
}
