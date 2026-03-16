#!/usr/bin/env node
/**
 * Kitchen setup script
 *
 * Usage:
 *   node scripts/setup.mjs              # scaffold + validate
 *   node scripts/setup.mjs --validate-only  # skip scaffolding, validate only
 *
 * Note: if Redis and Postgres are running via Docker (`docker compose up`),
 * ensure the containers are running before validating — the connectivity
 * checks will fail if the services are not up.
 */

import { copyFileSync, existsSync, readFileSync } from 'fs'
import { createConnection } from 'net'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
import { parse as parseYamlDoc } from 'yaml'

const root = dirname(fileURLToPath(new URL('.', import.meta.url)))
const validateOnly = process.argv.includes('--validate-only')

// ─── Helpers ────────────────────────────────────────────────────────────────

const green = (s) => `\x1b[32m${s}\x1b[0m`
const red = (s) => `\x1b[31m${s}\x1b[0m`
const dim = (s) => `\x1b[2m${s}\x1b[0m`
const bold = (s) => `\x1b[1m${s}\x1b[0m`

function pass(label) { console.log(`  ${green('✓')} ${label}`) }
function fail(label, hint) { console.log(`  ${red('✗')} ${label}${hint ? dim('  → ' + hint) : ''}`) }

function parseEnvFile(path) {
  if (!existsSync(path)) return {}
  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split('\n')
      .filter(line => line && !line.startsWith('#') && line.includes('='))
      .map(line => {
        const idx = line.indexOf('=')
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
      })
  )
}

function parseYaml(path) {
  if (!existsSync(path)) return null
  const doc = parseYamlDoc(readFileSync(path, 'utf8'))
  const get = (keyPath) => {
    const val = keyPath.split('.').reduce((obj, k) => obj?.[k], doc)
    return val != null ? String(val) : null
  }
  return { get }
}

function tcpCheck(urlStr) {
  return new Promise((resolve) => {
    try {
      const url = new URL(urlStr)
      const port = parseInt(url.port) || (url.protocol === 'redis:' ? 6379 : 5432)
      // Docker service names (bare hostnames with no dots) are only resolvable inside
      // the container. Since this script runs on the host, use localhost instead —
      // ports are mapped to the host via docker-compose.
      const host = url.hostname.includes('.') ? url.hostname : 'localhost'
      const socket = createConnection({ host, port }, () => {
        socket.destroy()
        resolve(true)
      })
      socket.on('error', () => resolve(false))
      socket.setTimeout(3000, () => { socket.destroy(); resolve(false) })
    } catch {
      resolve(false)
    }
  })
}

// ─── Phase 1: Scaffold ────────────────────────────────────────────────────

function scaffold() {
  console.log(bold('\nScaffolding config files'))
  let skipped = 0

  const files = [
    ['.kitchen.example.yaml', '.kitchen.yaml'],
    ['.env.example', '.env'],
  ]

  for (const [src, dest] of files) {
    const srcPath = join(root, src)
    const destPath = join(root, dest)
    if (existsSync(destPath)) {
      console.log(`  ${dim('–')} ${dest} ${dim('already exists, skipping')}`)
      skipped++
    } else if (!existsSync(srcPath)) {
      fail(dest, `${src} not found`)
    } else {
      copyFileSync(srcPath, destPath)
      pass(`${dest} created from ${src}`)
    }
  }

  if (skipped === files.length) {
    console.log(dim('  Both files already present — nothing to scaffold'))
  } else if (skipped < files.length) {
    console.log(dim('\n  Fill in your values, then re-run with --validate-only'))
  }
}

// ─── Phase 2: Validate ────────────────────────────────────────────────────

async function validate() {
  console.log(bold('\nValidating configuration'))

  const envPath = join(root, '.env')
  const yamlPath = join(root, '.kitchen.yaml')

  if (!existsSync(envPath)) {
    fail('.env', 'file not found — run without --validate-only to scaffold')
    return
  }
  if (!existsSync(yamlPath)) {
    fail('.kitchen.yaml', 'file not found — run without --validate-only to scaffold')
    return
  }

  const env = parseEnvFile(envPath)
  const yaml = parseYaml(yamlPath)

  // ANTHROPIC_API_KEY
  const apiKey = env['ANTHROPIC_API_KEY'] || env['CLAUDE_CODE_OAUTH_TOKEN']
  if (apiKey && apiKey !== '' && !apiKey.includes('...')) {
    pass('ANTHROPIC_API_KEY is set')
  } else {
    fail('ANTHROPIC_API_KEY is not set', 'set ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN in .env')
  }

  // plugins config
  const pluginsPath = yaml.get('plugins.path')
  const pluginsGitUrl = yaml.get('plugins.git.url')
  if (pluginsPath || pluginsGitUrl) {
    pass(`plugins configured  ${dim(pluginsGitUrl ? `(git: ${pluginsGitUrl})` : `(path: ${pluginsPath})`)}`)
  } else {
    fail('plugins not configured', 'set plugins.path and/or plugins.git.url in .kitchen.yaml')
  }

  // Slack token
  const slackToken = Object.keys(env).find(k => k.endsWith('_SLACK_BOT_TOKEN') && env[k] && !env[k].includes('...'))
  if (slackToken) {
    pass(`Slack bot token set  ${dim(`(${slackToken})`)}`)
  } else {
    fail('No Slack bot token found', 'set a *_SLACK_BOT_TOKEN in .env matching your agent name')
  }

  // Redis connectivity
  const redisUrl = yaml.get('redis.url') || 'redis://localhost:6379'
  const redisOk = await tcpCheck(redisUrl)
  if (redisOk) {
    pass(`Redis reachable  ${dim(`(${redisUrl})`)}`)
  } else {
    fail(`Redis not reachable  ${dim(`(${redisUrl})`)}`, 'is docker compose up?')
  }

  // Postgres connectivity
  const postgresUrl = yaml.get('postgres.url') || 'postgres://localhost:5432'
  const pgOk = await tcpCheck(postgresUrl)
  if (pgOk) {
    pass(`Postgres reachable  ${dim(`(${postgresUrl})`)}`)
  } else {
    fail(`Postgres not reachable  ${dim(`(${postgresUrl})`)}`, 'is docker compose up?')
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────

if (!validateOnly) scaffold()
await validate()
console.log()
