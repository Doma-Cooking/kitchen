export type TaskOutcome = 'success' | 'failure'

export interface TaskLog {
  id: number
  agentId: string
  taskType: string
  outcome: TaskOutcome
  durationMs: number
  error?: string
  metadata: Record<string, unknown>
  createdAt: Date
}
