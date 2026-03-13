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

// Copy all non-TS plugin assets (agent prompts, SKILL.md files, SOPs, templates)
const pluginsSource = join(root, 'src/plugins')
const pluginsDest = join(root, 'dist/plugins')
mkdirSync(pluginsDest, { recursive: true })
cpSync(pluginsSource, pluginsDest, {
  recursive: true,
  filter: (src) => !src.endsWith('.ts'),
})
