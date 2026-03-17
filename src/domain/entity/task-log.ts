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

export interface TaskMetric {
  agentId: string
  taskType: string
  total: number
  successCount: number
  failureCount: number
  successRate: number
  avgDurationMs: number
}
