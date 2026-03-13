#!/usr/bin/env npx tsx

import { Command } from 'commander'
import { LinearClient } from '@linear/sdk'
import fs from 'node:fs'

const LINEAR_TOKEN_URL = 'https://api.linear.app/oauth/token'
const LINEAR_SCOPES = 'app:mentionable,app:assignable,read,write'
const LINEAR_TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const CACHE_PATH = '/tmp/kitchen-tokens.json'

interface TokenCache {
  linear?: { token: string; expiresAt: number }
  github?: { token: string; expiresAt: number }
}

function readCache(): TokenCache {
  try { return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8')) } catch { return {} }
}

function writeCache(cache: TokenCache): void {
  try { fs.writeFileSync(CACHE_PATH, JSON.stringify(cache), { mode: 0o600 }) } catch { /* best-effort */ }
}

let cachedToken: string | undefined

async function fetchToken(): Promise<string> {
  const cached = readCache()
  if (cached.linear && cached.linear.expiresAt > Date.now() + 60_000) {
    return cached.linear.token
  }

  const clientId = process.env['LINEAR_CLIENT_ID']
  const clientSecret = process.env['LINEAR_CLIENT_SECRET']
  if (!clientId || !clientSecret) throw new Error('LINEAR_CLIENT_ID and LINEAR_CLIENT_SECRET must be set')

  const res = await fetch(LINEAR_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: LINEAR_SCOPES,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Failed to fetch Linear token: ${res.status} ${body}`)
  }

  const data = await res.json() as { access_token: string }
  cachedToken = data.access_token
  const updated = readCache()
  updated.linear = { token: cachedToken, expiresAt: Date.now() + LINEAR_TOKEN_TTL_MS }
  writeCache(updated)
  return cachedToken
}

async function getClient(): Promise<LinearClient> {
  const accessToken = cachedToken ?? await fetchToken()
  return new LinearClient({ accessToken })
}

async function withRetry<T>(fn: (client: LinearClient) => Promise<T>): Promise<T> {
  const client = await getClient()
  try {
    return await fn(client)
  } catch (err: unknown) {
    const status = (err as { status?: number }).status
    const message = err instanceof Error ? err.message : String(err)
    if (status === 401 || message.includes('401') || message.toLowerCase().includes('unauthorized')) {
      cachedToken = undefined
      const cache = readCache()
      delete cache.linear
      writeCache(cache)
      const retryClient = await getClient()
      return await fn(retryClient)
    }
    throw err
  }
}

function fail(e: unknown): never {
  console.error((e as Error).message)
  process.exit(1)
}

const program = new Command()
  .name('kitchen-linear')
  .description('Linear tools CLI')

program
  .command('create-issue')
  .description('Create an issue in Linear')
  .requiredOption('--title <title>', 'Issue title')
  .requiredOption('--teamId <id>', 'Team ID to create the issue in')
  .option('--description <text>', 'Issue description (markdown)')
  .option('--priority <number>', 'Priority (0=none, 1=urgent, 2=high, 3=medium, 4=low)', parseInt)
  .option('--assigneeId <id>', 'User ID to assign the issue to')
  .option('--labelIds <json>', 'Label IDs to apply (JSON array)', '[]')
  .action(async (opts) => {
    try {
      const result = await withRetry((client) =>
        client.createIssue({
          title: opts.title,
          teamId: opts.teamId,
          description: opts.description,
          priority: opts.priority,
          assigneeId: opts.assigneeId,
          labelIds: JSON.parse(opts.labelIds),
        }),
      )
      const issue = await result.issue
      console.log(`Issue created: ${issue?.identifier} — ${issue?.title}\nURL: ${issue?.url}`)
    } catch (e) { fail(e) }
  })

program
  .command('update-issue')
  .description('Update an existing Linear issue')
  .requiredOption('--issueId <id>', 'Issue ID to update')
  .option('--title <title>', 'New title')
  .option('--description <text>', 'New description')
  .option('--stateId <id>', 'New state/status ID')
  .option('--priority <number>', 'New priority (0=none, 1=urgent, 2=high, 3=medium, 4=low)', parseInt)
  .action(async (opts) => {
    try {
      await withRetry((client) =>
        client.updateIssue(opts.issueId, {
          title: opts.title,
          description: opts.description,
          stateId: opts.stateId,
          priority: opts.priority,
        }),
      )
      console.log(`Issue ${opts.issueId} updated.`)
    } catch (e) { fail(e) }
  })

program
  .command('add-comment')
  .description('Add a comment to a Linear issue')
  .requiredOption('--issueId <id>', 'Issue ID to comment on')
  .requiredOption('--body <text>', 'Comment body (markdown)')
  .action(async (opts) => {
    try {
      await withRetry((client) => client.createComment({ issueId: opts.issueId, body: opts.body }))
      console.log(`Comment added to issue ${opts.issueId}.`)
    } catch (e) { fail(e) }
  })

program
  .command('list-issues')
  .description('List issues in a Linear team')
  .requiredOption('--teamId <id>', 'Team ID to list issues for')
  .option('--filter <text>', 'Optional filter query string')
  .action(async (opts) => {
    try {
      const team = await withRetry((client) => client.team(opts.teamId))
      const issues = await team.issues({
        first: 25,
        filter: opts.filter ? { title: { contains: opts.filter } } : undefined,
      })
      const summary = issues.nodes
        .map((i) => `${i.identifier}: ${i.title} [${i.state ? 'stateful' : 'unknown'}] (P${i.priority})`)
        .join('\n')
      console.log(summary || 'No issues found.')
    } catch (e) { fail(e) }
  })

program
  .command('emit-activity')
  .description('Emit an activity on a Linear agent session (thought, response, action, error)')
  .requiredOption('--agentSessionId <id>', 'Agent session ID from the webhook event')
  .requiredOption('--type <type>', 'Activity type (thought, response, action, error, elicitation)')
  .option('--body <text>', 'Activity body (markdown). Required for thought, response, error, elicitation.')
  .option('--action <name>', 'Action name (for type=action)')
  .option('--parameter <value>', 'Action parameter (for type=action)')
  .option('--result <value>', 'Action result (for type=action)')
  .action(async (opts) => {
    try {
      let content: Record<string, unknown>
      if (opts.type === 'action') {
        content = { type: opts.type, action: opts.action, parameter: opts.parameter, result: opts.result }
      } else {
        content = { type: opts.type, body: opts.body }
      }
      const response = await withRetry((client) =>
        client.createAgentActivity({ agentSessionId: opts.agentSessionId, content }),
      )
      console.log(response.success ? `Activity emitted: ${opts.type}` : 'Failed to emit activity.')
    } catch (e) { fail(e) }
  })

program
  .command('update-session')
  .description('Update a Linear agent session (set plan steps or external URLs)')
  .requiredOption('--agentSessionId <id>', 'Agent session ID')
  .option('--plan <json>', 'Plan steps (JSON array of {content, status} objects)')
  .option('--externalUrls <json>', 'External URLs (JSON array of {label, url} objects)')
  .action(async (opts) => {
    try {
      const input: Record<string, unknown> = {}
      if (opts.plan) input.plan = JSON.parse(opts.plan)
      if (opts.externalUrls) input.addedExternalUrls = JSON.parse(opts.externalUrls)
      await withRetry((client) => client.updateAgentSession(opts.agentSessionId, input))
      console.log(`Session ${opts.agentSessionId} updated.`)
    } catch (e) { fail(e) }
  })

program
  .command('list-teams')
  .description('List all teams in the Linear workspace')
  .action(async () => {
    try {
      const teams = await withRetry((client) => client.teams())
      const summary = teams.nodes
        .map((t) => `${t.key} — ${t.name} (${t.id})`)
        .join('\n')
      console.log(summary || 'No teams found.')
    } catch (e) { fail(e) }
  })

program
  .command('list-projects')
  .description('List projects in the workspace, optionally filtered by team')
  .option('--teamId <id>', 'Filter projects to a specific team')
  .action(async (opts) => {
    try {
      const projects = await withRetry(async (client) => {
        if (opts.teamId) {
          const team = await client.team(opts.teamId)
          return team.projects({ first: 50 })
        }
        return client.projects({ first: 50 })
      })
      const summary = projects.nodes
        .map((p) => `${p.name} (${p.id}) — state: ${p.state}, progress: ${Math.round(p.progress * 100)}%`)
        .join('\n')
      console.log(summary || 'No projects found.')
    } catch (e) { fail(e) }
  })

program
  .command('get-issue')
  .description('Get detailed information about a single Linear issue')
  .requiredOption('--issueId <id>', 'Issue ID or identifier (e.g. "ENG-123")')
  .action(async (opts) => {
    try {
      const issue = await withRetry((client) => client.issue(opts.issueId))
      const state = await issue.state
      const assignee = await issue.assignee
      const labels = await issue.labels()
      const labelNames = labels.nodes.map((l) => l.name).join(', ')
      const text = [
        `${issue.identifier}: ${issue.title}`,
        `State: ${state?.name ?? 'unknown'}`,
        `Priority: P${issue.priority}`,
        `Assignee: ${assignee?.name ?? 'unassigned'}`,
        `Labels: ${labelNames || 'none'}`,
        `URL: ${issue.url}`,
        issue.description ? `\nDescription:\n${issue.description}` : '',
      ].filter(Boolean).join('\n')
      console.log(text)
    } catch (e) { fail(e) }
  })

program
  .command('list-states')
  .description('List workflow states for a team')
  .requiredOption('--teamId <id>', 'Team ID to list states for')
  .action(async (opts) => {
    try {
      const team = await withRetry((client) => client.team(opts.teamId))
      const states = await team.states()
      const summary = states.nodes
        .map((s) => `${s.name} (${s.id}) — type: ${s.type}`)
        .join('\n')
      console.log(summary || 'No states found.')
    } catch (e) { fail(e) }
  })

program
  .command('list-members')
  .description('List members in the workspace, optionally filtered by team')
  .option('--teamId <id>', 'Filter members to a specific team')
  .action(async (opts) => {
    try {
      const members = await withRetry(async (client) => {
        if (opts.teamId) {
          const team = await client.team(opts.teamId)
          return team.members({ first: 50 })
        }
        return client.users({ first: 50 })
      })
      const summary = members.nodes
        .map((m) => `${m.name} (${m.id}) — ${m.displayName} — ${m.email}`)
        .join('\n')
      console.log(summary || 'No members found.')
    } catch (e) { fail(e) }
  })

program
  .command('list-labels')
  .description('List labels in the workspace, optionally filtered by team')
  .option('--teamId <id>', 'Filter labels to a specific team')
  .action(async (opts) => {
    try {
      const labels = await withRetry(async (client) => {
        if (opts.teamId) {
          const team = await client.team(opts.teamId)
          return team.labels({ first: 50 })
        }
        return client.issueLabels({ first: 50 })
      })
      const summary = labels.nodes
        .map((l) => `${l.name} (${l.id}) — color: ${l.color}`)
        .join('\n')
      console.log(summary || 'No labels found.')
    } catch (e) { fail(e) }
  })

program
  .command('list-project-statuses')
  .description('List available project statuses in the workspace')
  .action(async () => {
    try {
      const statuses = await withRetry((client) => client.projectStatuses())
      const summary = statuses.nodes
        .map((s) => `${s.name} (${s.id}) — type: ${s.type}`)
        .join('\n')
      console.log(summary || 'No project statuses found.')
    } catch (e) { fail(e) }
  })

program
  .command('create-project')
  .description('Create a new project in Linear')
  .requiredOption('--name <name>', 'Project name')
  .requiredOption('--teamIds <json>', 'Team IDs to associate with the project (JSON array)')
  .option('--description <text>', 'Project description')
  .option('--statusId <id>', 'Project status ID')
  .option('--targetDate <date>', 'Target date (ISO 8601)')
  .action(async (opts) => {
    try {
      const result = await withRetry((client) =>
        client.createProject({
          name: opts.name,
          teamIds: JSON.parse(opts.teamIds),
          description: opts.description,
          statusId: opts.statusId,
          targetDate: opts.targetDate,
        }),
      )
      const project = await result.project
      console.log(`Project created: ${project?.name} (${project?.id})\nURL: ${project?.url}`)
    } catch (e) { fail(e) }
  })

program
  .command('update-project')
  .description('Update an existing Linear project')
  .requiredOption('--projectId <id>', 'Project ID to update')
  .option('--name <name>', 'New name')
  .option('--description <text>', 'New description')
  .option('--statusId <id>', 'Project status ID')
  .option('--targetDate <date>', 'New target date (ISO 8601)')
  .action(async (opts) => {
    try {
      await withRetry((client) =>
        client.updateProject(opts.projectId, {
          name: opts.name,
          description: opts.description,
          statusId: opts.statusId,
          targetDate: opts.targetDate,
        }),
      )
      console.log(`Project ${opts.projectId} updated.`)
    } catch (e) { fail(e) }
  })

program
  .command('add-issue-to-project')
  .description('Add an issue to a project')
  .requiredOption('--issueId <id>', 'Issue ID to add to the project')
  .requiredOption('--projectId <id>', 'Project ID to add the issue to')
  .action(async (opts) => {
    try {
      await withRetry((client) => client.updateIssue(opts.issueId, { projectId: opts.projectId }))
      console.log(`Issue ${opts.issueId} added to project ${opts.projectId}.`)
    } catch (e) { fail(e) }
  })

program
  .command('list-project-issues')
  .description('List issues in a project')
  .requiredOption('--projectId <id>', 'Project ID to list issues for')
  .action(async (opts) => {
    try {
      const project = await withRetry((client) => client.project(opts.projectId))
      const issues = await project.issues({ first: 50 })
      const summary = issues.nodes
        .map((i) => `${i.identifier}: ${i.title} [${i.state ? 'stateful' : 'unknown'}] (P${i.priority})`)
        .join('\n')
      console.log(summary || 'No issues found.')
    } catch (e) { fail(e) }
  })

program
  .command('get-project')
  .description('Get detailed information about a Linear project')
  .requiredOption('--projectId <id>', 'Project ID')
  .action(async (opts) => {
    try {
      const project = await withRetry((client) => client.project(opts.projectId))
      const text = [
        `${project.name} (${project.id})`,
        `State: ${project.state}`,
        `Progress: ${Math.round(project.progress * 100)}%`,
        project.targetDate ? `Target date: ${project.targetDate}` : '',
        `URL: ${project.url}`,
        project.description ? `\nDescription:\n${project.description}` : '',
      ].filter(Boolean).join('\n')
      console.log(text)
    } catch (e) { fail(e) }
  })

program
  .command('get-templates')
  .description('List issue templates available in the workspace')
  .option('--teamId <id>', 'Filter templates to a specific team')
  .action(async (opts) => {
    try {
      const templates = await withRetry(async (client) => {
        if (opts.teamId) {
          const team = await client.team(opts.teamId)
          return team.templates()
        }
        return client.templates
      })
      const nodes = Array.isArray(templates) ? templates : (templates as { nodes: unknown[] }).nodes
      const summary = await Promise.all(
        (nodes as Array<{ id: string; name: string; description?: string; templateData: unknown; team?: { name: string; id: string } | null }>).map(async (t) => {
          const team = t.team ? (typeof t.team === 'object' && 'name' in t.team ? t.team : await (t.team as unknown as Promise<{ name: string; id: string }>)) : null
          return [
            `## ${t.name} (${t.id})`,
            team ? `Team: ${team.name}` : 'Workspace-level template',
            t.description ? `Description: ${t.description}` : '',
            `Template data:\n${JSON.stringify(t.templateData, null, 2)}`,
          ].filter(Boolean).join('\n')
        }),
      )
      console.log(summary.join('\n\n---\n\n') || 'No templates found.')
    } catch (e) { fail(e) }
  })

program
  .command('search-issues')
  .description('Search and filter issues across the workspace')
  .option('--teamId <id>', 'Filter by team ID')
  .option('--stateId <id>', 'Filter by state ID')
  .option('--assigneeId <id>', 'Filter by assignee user ID')
  .option('--labelId <id>', 'Filter by label ID')
  .option('--priority <number>', 'Filter by priority (0=none, 1=urgent, 2=high, 3=medium, 4=low)', parseInt)
  .option('--query <text>', 'Search by title (contains)')
  .action(async (opts) => {
    try {
      const filter: Record<string, unknown> = {}
      if (opts.teamId) filter.team = { id: { eq: opts.teamId } }
      if (opts.stateId) filter.state = { id: { eq: opts.stateId } }
      if (opts.assigneeId) filter.assignee = { id: { eq: opts.assigneeId } }
      if (opts.labelId) filter.labels = { id: { eq: opts.labelId } }
      if (opts.priority !== undefined) filter.priority = { eq: opts.priority }
      if (opts.query) filter.title = { contains: opts.query }

      const issues = await withRetry((client) =>
        client.issues({ first: 50, filter }),
      )
      const summary = issues.nodes
        .map((i) => `${i.identifier}: ${i.title} [${i.state ? 'stateful' : 'unknown'}] (P${i.priority})`)
        .join('\n')
      console.log(summary || 'No issues found.')
    } catch (e) { fail(e) }
  })

await program.parseAsync()
