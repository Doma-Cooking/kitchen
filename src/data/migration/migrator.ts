import fs from 'node:fs'
import path from 'node:path'
import type pg from 'pg'

export class Migrator {
  private readonly pool: pg.Pool

  constructor(pool: pg.Pool) {
    this.pool = pool
  }

  async migrate(): Promise<void> {
    await this.ensureMigrationsTable()
    const applied = await this.getAppliedVersions()
    const migrations = this.loadMigrationFiles()

    for (const migration of migrations) {
      if (applied.has(migration.version)) continue

      const client = await this.pool.connect()
      try {
        await client.query('BEGIN')
        await client.query(migration.sql)
        await client.query('INSERT INTO schema_migrations (version, name) VALUES ($1, $2)', [migration.version, migration.name])
        await client.query('COMMIT')
        console.log(`Applied migration ${migration.version}: ${migration.name}`)
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    }
  }

  private async ensureMigrationsTable(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INT PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT now()
      )
    `)
  }

  private async getAppliedVersions(): Promise<Set<number>> {
    const result = await this.pool.query('SELECT version FROM schema_migrations')
    return new Set(result.rows.map((row: { version: number }) => row.version))
  }

  private loadMigrationFiles(): { version: number; name: string; sql: string }[] {
    const migrationsDir = path.join(import.meta.dirname, 'migrations')
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()

    return files.map((file) => {
      const match = file.match(/^(\d+)_(.+)\.sql$/)
      if (!match) throw new Error(`Invalid migration filename: ${file}`)
      return {
        version: parseInt(match[1], 10),
        name: match[2],
        sql: fs.readFileSync(path.join(migrationsDir, file), 'utf-8'),
      }
    })
  }
}
