import type { AgentEvent } from './agent-event.ts'

export type LockKeyResolver = (event: AgentEvent, defaultAgentId: string) => string[]

export const defaultLockKeyResolver: LockKeyResolver = (event, defaultAgentId) => {
  const stationId = event.stationId ?? (event.agentId || defaultAgentId)
  return [`kitchen:lock:station:${stationId}`]
}
