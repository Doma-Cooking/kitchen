import type pg from 'pg'
import type { TaskLog, TaskMetric, TaskOutcome } from '../../domain/entity/task-log.js'
import type { EventTrigger } from '../../domain/entity/event-trigger.js'

export class LogRepository {
  constructor(private readonly pool: pg.Pool) {}

  async writeTaskLog(params: {
    agentId: string
    trigger: EventTrigger
    outcome: TaskOutcome
    durationMs: number
    error?: string
    metadata?: Record<string, unknown>
  }): Promise<void> {
    const taskType = deriveTaskType(params.trigger)
    this.pool
      .query(
        `INSERT INTO task_logs (agent_id, task_type, outcome, duration_ms, error, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          params.agentId,
          taskType,
          params.outcome,
          params.durationMs,
          params.error ?? null,
          JSON.stringify(params.metadata ?? {}),
        ],
      )
      .catch((err) => {
        console.error('Failed to write task log (non-fatal):', err)
      })
  }

  async queryLogs(params: {
    agentId?: string
    taskType?: string
    from?: Date
    to?: Date
    limit?: number
    offset?: number
  }): Promise<TaskLog[]> {
    const conditions: string[] = []
    const values: unknown[] = []

    if (params.agentId) {
      values.push(params.agentId)
      conditions.push(`agent_id = $${values.length}`)
    }
    if (params.taskType) {
      values.push(params.taskType)
      conditions.push(`task_type = $${values.length}`)
    }
    if (params.from) {
      values.push(params.from)
      conditions.push(`created_at >= $${values.length}`)
    }
    if (params.to) {
      values.push(params.to)
      conditions.push(`created_at <= $${values.length}`)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const limit = params.limit ?? 100
    const offset = params.offset ?? 0

    values.push(limit, offset)
    const result = await this.pool.query(
      `SELECT id, agent_id, task_type, outcome, duration_ms, error, metadata, created_at
       FROM task_logs ${where}
       ORDER BY created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    )

    return result.rows.map((row) => ({
      id: row.id,
      agentId: row.agent_id,
      taskType: row.task_type,
      outcome: row.outcome,
      durationMs: row.duration_ms,
      error: row.error ?? undefined,
      metadata: row.metadata,
      createdAt: row.created_at,
    }))
  }
  async getMetrics(params: { from: Date; to?: Date }): Promise<TaskMetric[]> {
    const values: unknown[] = [params.from]
    const toCondition = params.to ? `AND created_at <= $2` : ''
    if (params.to) values.push(params.to)

    const result = await this.pool.query(
      `SELECT
         agent_id,
         task_type,
         COUNT(*)                                          AS total,
         COUNT(*) FILTER (WHERE outcome = 'success')      AS success_count,
         COUNT(*) FILTER (WHERE outcome = 'failure')      AS failure_count,
         ROUND(AVG(duration_ms))                          AS avg_duration_ms
       FROM task_logs
       WHERE created_at >= $1 ${toCondition}
       GROUP BY agent_id, task_type
       ORDER BY agent_id, task_type`,
      values,
    )

    return result.rows.map((row) => {
      const total = Number(row.total)
      const successCount = Number(row.success_count)
      return {
        agentId: row.agent_id,
        taskType: row.task_type,
        total,
        successCount,
        failureCount: Number(row.failure_count),
        successRate: total > 0 ? Math.round((successCount / total) * 100) : 0,
        avgDurationMs: Number(row.avg_duration_ms),
      }
    })
  }
}

function deriveTaskType(trigger: EventTrigger): string {
  switch (trigger.type) {
    case 'cron':
      return trigger.scheduleName ? `cron/${trigger.scheduleName}` : 'cron'
    case 'slack':
      return 'slack'
    case 'api':
      return 'api'
    case 'agent':
      return 'agent'
  }
}
