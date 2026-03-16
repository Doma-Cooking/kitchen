import { cpSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const root = fileURLToPath(new URL('..', import.meta.url))

// Copy SQL migrations (no-op if directory doesn't exist)
const migrationsSource = join(root, 'src/data/migration/migrations')
const migrationsDest = join(root, 'dist/data/migration/migrations')
if (existsSync(migrationsSource)) {
  mkdirSync(migrationsDest, { recursive: true })
  cpSync(migrationsSource, migrationsDest, {
    recursive: true,
    filter: (src) => !src.endsWith('.ts'),
  })
}