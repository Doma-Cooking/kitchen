import pg from 'pg'
import { Migrator } from '../migration/migrator.ts'
import { ConfigRepository } from '../repository/config.repository.ts'

export class PostgresSource {
  readonly pool: pg.Pool

  constructor(private readonly configRepository: ConfigRepository) {
    this.pool = new pg.Pool({ connectionString: this.configRepository.getConfig().postgres.url })
  }

  async init(): Promise<void> {
    const migrator = new Migrator(this.pool)
    await migrator.migrate()
  }

  async close(): Promise<void> {
    await this.pool.end()
  }
}
