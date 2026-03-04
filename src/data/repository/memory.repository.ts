import type pg from 'pg'
import type { AgentMemory } from '../../domain/entity/agent-memory.ts'

export class MemoryRepository {
  private readonly pool: pg.Pool

  constructor(pool: pg.Pool) {
    this.pool = pool
  }

  async getMemory(memoryId: string): Promise<AgentMemory | undefined> {
    const result = await this.pool.query('SELECT session_id FROM agent_memory WHERE memory_id = $1', [memoryId])
    if (result.rows.length === 0) return undefined
    return { sessionId: result.rows[0].session_id }
  }

  async setMemory(memoryId: string, memory: AgentMemory): Promise<void> {
    await this.pool.query(
      'INSERT INTO agent_memory (memory_id, session_id) VALUES ($1, $2) ON CONFLICT (memory_id) DO UPDATE SET session_id = $2',
      [memoryId, memory.sessionId],
    )
  }
}
