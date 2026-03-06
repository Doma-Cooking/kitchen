import type pg from 'pg'
import type { AgentStation } from '../../domain/entity/agent-station.ts'

export class StationRepository {
  private readonly pool: pg.Pool

  constructor(pool: pg.Pool) {
    this.pool = pool
  }

  async getStation(stationId: string): Promise<AgentStation | undefined> {
    const result = await this.pool.query('SELECT session_id FROM agent_station WHERE station_id = $1', [stationId])
    if (result.rows.length === 0) return undefined
    return { sessionId: result.rows[0].session_id }
  }

  async setStation(stationId: string, station: AgentStation): Promise<void> {
    await this.pool.query(
      'INSERT INTO agent_station (station_id, session_id) VALUES ($1, $2) ON CONFLICT (station_id) DO UPDATE SET session_id = $2',
      [stationId, station.sessionId],
    )
  }
}
