import esbuild from 'esbuild'
import { readdirSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const srcDir = join(__dirname, '..', 'src')
const distDir = join(__dirname, '..', 'dist')

// CLI binaries that need a #!/usr/bin/env node shebang injected
const CLI_BINARIES = [
  'plugins/shared/tools/github.js',
  'plugins/shared/tools/linear.js',
  'plugins/shared/tools/slack.js',
  'plugins/shared/tools/notion.js',
  'plugins/shared/tools/kitchen.js',
  'plugins/domains/engineering/tools/typescript.js',
]

function collectTsFiles(dir, results = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) collectTsFiles(full, results)
    else if (entry.name.endsWith('.ts')) results.push(full)
  }
  return results
}

const tsFiles = collectTsFiles(srcDir)

// Compile each .ts file independently — no bundling, preserves directory layout
await esbuild.build({
  entryPoints: tsFiles,
  outdir: distDir,
  outbase: srcDir,
  bundle: false,
  platform: 'node',
  format: 'esm',
  target: 'node22',
})

// Rewrite .ts import extensions to .js (esbuild preserves them verbatim with bundle:false)
function rewriteImports(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) rewriteImports(full)
    else if (entry.name.endsWith('.js')) {
      const content = readFileSync(full, 'utf-8')
      const rewritten = content.replace(
        /\bfrom\s+(['"])([^'"]+)\.ts\1/g,
        (_, q, p) => `from ${q}${p}.js${q}`
      )
      if (rewritten !== content) writeFileSync(full, rewritten)
    }
  }
}

rewriteImports(distDir)

// Inject #!/usr/bin/env node shebang into CLI binary outputs (replacing any existing shebang)
for (const relPath of CLI_BINARIES) {
  const filePath = join(distDir, relPath)
  if (existsSync(filePath)) {
    const content = readFileSync(filePath, 'utf-8')
    const stripped = content.startsWith('#!') ? content.slice(content.indexOf('\n') + 1) : content
    writeFileSync(filePath, `#!/usr/bin/env node\n${stripped}`)
  }
}

// Copy SQL migration files if any exist
const migrSrc = join(srcDir, 'data', 'migration', 'migrations')
const migrDst = join(distDir, 'data', 'migration', 'migrations')
if (existsSync(migrSrc)) {
  const sqlFiles = readdirSync(migrSrc).filter((f) => f.endsWith('.sql'))
  if (sqlFiles.length > 0) {
    mkdirSync(migrDst, { recursive: true })
    for (const f of sqlFiles) copyFileSync(join(migrSrc, f), join(migrDst, f))
    console.log(`Copied ${sqlFiles.length} SQL migration(s) to dist/`)
  }
}

console.log(`Built ${tsFiles.length} TypeScript files → dist/`)
