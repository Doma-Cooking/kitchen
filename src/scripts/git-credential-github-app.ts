#!/usr/bin/env npx tsx

// Git credential helper for GitHub App / PAT authentication.
// Implements the git credential helper protocol:
// - "get"   → read stdin for host info, return username + password on stdout
// - "store" / "erase" → no-op

import { createAppAuth } from '@octokit/auth-app'
import * as readline from 'readline'

const operation = process.argv[2]
if (operation !== 'get') process.exit(0)

// Read stdin key=value pairs
const rl = readline.createInterface({ input: process.stdin })
const fields: Record<string, string> = {}
for await (const line of rl) {
  if (line === '') break
  const [key, ...rest] = line.split('=')
  fields[key] = rest.join('=')
}

// Only handle github.com
if (fields.host !== 'github.com') process.exit(0)

// PAT mode
const pat = process.env['GITHUB_TOKEN']
if (pat) {
  process.stdout.write(`username=x-access-token\npassword=${pat}\n`)
  process.exit(0)
}

// App mode
const appId = process.env['GITHUB_APP_ID']
const privateKey = process.env['GITHUB_PRIVATE_KEY']
const installationId = process.env['GITHUB_INSTALLATION_ID']
if (!appId || !privateKey || !installationId) process.exit(1)

const auth = createAppAuth({ appId, privateKey, installationId })
const { token } = await auth({ type: 'installation' })
process.stdout.write(`username=x-access-token\npassword=${token}\n`)
