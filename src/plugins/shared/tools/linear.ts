#!/usr/bin/env npx tsx

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { LinearClient } from '@linear/sdk'
import { z } from 'zod'

const server = new McpServer({
  name: 'linear',
  version: '1.0.0',
})

const LINEAR_TOKEN_URL = 'https://api.linear.app/oauth/token'
const LINEAR_SCOPES = 'app:mentionable,app:assignable,read,write'

let cachedToken: string | undefined

async function fetchToken(): Promise<string> {
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
      const retryClient = await getClient()
      return await fn(retryClient)
    }
    throw err
  }
}

server.registerTool(
  'linear_create_issue',
  {
    description: 'Create an issue in Linear',
    inputSchema: {
      title: z.string().describe('Issue title'),
      teamId: z.string().describe('Team ID to create the issue in'),
      description: z.string().optional().describe('Issue description (markdown)'),
      priority: z.number().optional().describe('Priority (0=none, 1=urgent, 2=high, 3=medium, 4=low)'),
      assigneeId: z.string().optional().describe('User ID to assign the issue to'),
      labelIds: z.array(z.string()).optional().describe('Label IDs to apply'),
    },
  },
  async ({ title, teamId, description, priority, assigneeId, labelIds }) => {
    const result = await withRetry((client) =>
      client.createIssue({ title, teamId, description, priority, assigneeId, labelIds }),
    )
    const issue = await result.issue
    return {
      content: [{ type: 'text' as const, text: `Issue created: ${issue?.identifier} — ${issue?.title}\nURL: ${issue?.url}` }],
    }
  },
)

server.registerTool(
  'linear_update_issue',
  {
    description: 'Update an existing Linear issue',
    inputSchema: {
      issueId: z.string().describe('Issue ID to update'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      stateId: z.string().optional().describe('New state/status ID'),
      priority: z.number().optional().describe('New priority (0=none, 1=urgent, 2=high, 3=medium, 4=low)'),
    },
  },
  async ({ issueId, title, description, stateId, priority }) => {
    await withRetry((client) => client.updateIssue(issueId, { title, description, stateId, priority }))
    return {
      content: [{ type: 'text' as const, text: `Issue ${issueId} updated.` }],
    }
  },
)

server.registerTool(
  'linear_add_comment',
  {
    description: 'Add a comment to a Linear issue',
    inputSchema: {
      issueId: z.string().describe('Issue ID to comment on'),
      body: z.string().describe('Comment body (markdown)'),
    },
  },
  async ({ issueId, body }) => {
    await withRetry((client) => client.createComment({ issueId, body }))
    return {
      content: [{ type: 'text' as const, text: `Comment added to issue ${issueId}.` }],
    }
  },
)

server.registerTool(
  'linear_list_issues',
  {
    description: 'List issues in a Linear team',
    inputSchema: {
      teamId: z.string().describe('Team ID to list issues for'),
      filter: z.string().optional().describe('Optional filter query string'),
    },
  },
  async ({ teamId, filter }) => {
    const team = await withRetry((client) => client.team(teamId))
    const issues = await team.issues({
      first: 25,
      filter: filter ? { title: { contains: filter } } : undefined,
    })
    const summary = issues.nodes
      .map((i) => `${i.identifier}: ${i.title} [${i.state ? 'stateful' : 'unknown'}] (P${i.priority})`)
      .join('\n')
    return {
      content: [{ type: 'text' as const, text: summary || 'No issues found.' }],
    }
  },
)

server.registerTool(
  'linear_emit_activity',
  {
    description: 'Emit an activity on a Linear agent session (thought, response, action, error)',
    inputSchema: {
      agentSessionId: z.string().describe('Agent session ID from the webhook event'),
      type: z.enum(['thought', 'response', 'action', 'error', 'elicitation']).describe('Activity type'),
      body: z.string().optional().describe('Activity body (markdown). Required for thought, response, error, elicitation.'),
      action: z.string().optional().describe('Action name (for type=action)'),
      parameter: z.string().optional().describe('Action parameter (for type=action)'),
      result: z.string().optional().describe('Action result (for type=action)'),
    },
  },
  async ({ agentSessionId, type, body, action, parameter, result }) => {
    let content: Record<string, unknown>
    if (type === 'action') {
      content = { type, action, parameter, result }
    } else {
      content = { type, body }
    }
    const response = await withRetry((client) =>
      client.createAgentActivity({ agentSessionId, content }),
    )
    return {
      content: [{ type: 'text' as const, text: response.success ? `Activity emitted: ${type}` : 'Failed to emit activity.' }],
    }
  },
)

server.registerTool(
  'linear_update_session',
  {
    description: 'Update a Linear agent session (set plan steps or external URLs)',
    inputSchema: {
      agentSessionId: z.string().describe('Agent session ID'),
      plan: z.array(z.object({
        content: z.string().describe('Step description'),
        status: z.enum(['pending', 'inProgress', 'completed', 'canceled']).describe('Step status'),
      })).optional().describe('Plan steps to display in the session'),
      externalUrls: z.array(z.object({
        label: z.string().describe('Link label'),
        url: z.string().describe('Link URL (must be unique)'),
      })).optional().describe('External URLs to display'),
    },
  },
  async ({ agentSessionId, plan, externalUrls }) => {
    const input: Record<string, unknown> = {}
    if (plan) input.plan = plan
    if (externalUrls) input.addedExternalUrls = externalUrls
    await withRetry((client) => client.updateAgentSession(agentSessionId, input))
    return {
      content: [{ type: 'text' as const, text: `Session ${agentSessionId} updated.` }],
    }
  },
)

// ── Discovery / Read ──────────────────────────────────────────────

server.registerTool(
  'linear_list_teams',
  {
    description: 'List all teams in the Linear workspace',
    inputSchema: {},
  },
  async () => {
    const teams = await withRetry((client) => client.teams())
    const summary = teams.nodes
      .map((t) => `${t.key} — ${t.name} (${t.id})`)
      .join('\n')
    return {
      content: [{ type: 'text' as const, text: summary || 'No teams found.' }],
    }
  },
)

server.registerTool(
  'linear_list_projects',
  {
    description: 'List projects in the workspace, optionally filtered by team',
    inputSchema: {
      teamId: z.string().optional().describe('Filter projects to a specific team'),
    },
  },
  async ({ teamId }) => {
    const projects = await withRetry(async (client) => {
      if (teamId) {
        const team = await client.team(teamId)
        return team.projects({ first: 50 })
      }
      return client.projects({ first: 50 })
    })
    const summary = projects.nodes
      .map((p) => `${p.name} (${p.id}) — state: ${p.state}, progress: ${Math.round(p.progress * 100)}%`)
      .join('\n')
    return {
      content: [{ type: 'text' as const, text: summary || 'No projects found.' }],
    }
  },
)

server.registerTool(
  'linear_get_issue',
  {
    description: 'Get detailed information about a single Linear issue',
    inputSchema: {
      issueId: z.string().describe('Issue ID or identifier (e.g. "ENG-123")'),
    },
  },
  async ({ issueId }) => {
    const issue = await withRetry((client) => client.issue(issueId))
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
    return {
      content: [{ type: 'text' as const, text }],
    }
  },
)

server.registerTool(
  'linear_list_states',
  {
    description: 'List workflow states for a team',
    inputSchema: {
      teamId: z.string().describe('Team ID to list states for'),
    },
  },
  async ({ teamId }) => {
    const team = await withRetry((client) => client.team(teamId))
    const states = await team.states()
    const summary = states.nodes
      .map((s) => `${s.name} (${s.id}) — type: ${s.type}`)
      .join('\n')
    return {
      content: [{ type: 'text' as const, text: summary || 'No states found.' }],
    }
  },
)

server.registerTool(
  'linear_list_members',
  {
    description: 'List members in the workspace, optionally filtered by team',
    inputSchema: {
      teamId: z.string().optional().describe('Filter members to a specific team'),
    },
  },
  async ({ teamId }) => {
    const members = await withRetry(async (client) => {
      if (teamId) {
        const team = await client.team(teamId)
        return team.members({ first: 50 })
      }
      return client.users({ first: 50 })
    })
    const summary = members.nodes
      .map((m) => `${m.name} (${m.id}) — ${m.displayName} — ${m.email}`)
      .join('\n')
    return {
      content: [{ type: 'text' as const, text: summary || 'No members found.' }],
    }
  },
)

server.registerTool(
  'linear_list_labels',
  {
    description: 'List labels in the workspace, optionally filtered by team',
    inputSchema: {
      teamId: z.string().optional().describe('Filter labels to a specific team'),
    },
  },
  async ({ teamId }) => {
    const labels = await withRetry(async (client) => {
      if (teamId) {
        const team = await client.team(teamId)
        return team.labels({ first: 50 })
      }
      return client.issueLabels({ first: 50 })
    })
    const summary = labels.nodes
      .map((l) => `${l.name} (${l.id}) — color: ${l.color}`)
      .join('\n')
    return {
      content: [{ type: 'text' as const, text: summary || 'No labels found.' }],
    }
  },
)

server.registerTool(
  'linear_list_project_statuses',
  {
    description: 'List available project statuses in the workspace (use these IDs when creating/updating projects)',
    inputSchema: {},
  },
  async () => {
    const statuses = await withRetry((client) => client.projectStatuses())
    const summary = statuses.nodes
      .map((s) => `${s.name} (${s.id}) — type: ${s.type}`)
      .join('\n')
    return {
      content: [{ type: 'text' as const, text: summary || 'No project statuses found.' }],
    }
  },
)

// ── Project Management ────────────────────────────────────────────

server.registerTool(
  'linear_create_project',
  {
    description: 'Create a new project in Linear',
    inputSchema: {
      name: z.string().describe('Project name'),
      teamIds: z.array(z.string()).describe('Team IDs to associate with the project'),
      description: z.string().optional().describe('Project description'),
      statusId: z.string().optional().describe('Project status ID'),
      targetDate: z.string().optional().describe('Target date (ISO 8601)'),
    },
  },
  async ({ name, teamIds, description, statusId, targetDate }) => {
    const result = await withRetry((client) =>
      client.createProject({ name, teamIds, description, statusId, targetDate }),
    )
    const project = await result.project
    return {
      content: [{ type: 'text' as const, text: `Project created: ${project?.name} (${project?.id})\nURL: ${project?.url}` }],
    }
  },
)

server.registerTool(
  'linear_update_project',
  {
    description: 'Update an existing Linear project',
    inputSchema: {
      projectId: z.string().describe('Project ID to update'),
      name: z.string().optional().describe('New name'),
      description: z.string().optional().describe('New description'),
      statusId: z.string().optional().describe('Project status ID'),
      targetDate: z.string().optional().describe('New target date (ISO 8601)'),
    },
  },
  async ({ projectId, name, description, statusId, targetDate }) => {
    await withRetry((client) =>
      client.updateProject(projectId, { name, description, statusId, targetDate }),
    )
    return {
      content: [{ type: 'text' as const, text: `Project ${projectId} updated.` }],
    }
  },
)

server.registerTool(
  'linear_add_issue_to_project',
  {
    description: 'Add an issue to a project',
    inputSchema: {
      issueId: z.string().describe('Issue ID to add to the project'),
      projectId: z.string().describe('Project ID to add the issue to'),
    },
  },
  async ({ issueId, projectId }) => {
    await withRetry((client) => client.updateIssue(issueId, { projectId }))
    return {
      content: [{ type: 'text' as const, text: `Issue ${issueId} added to project ${projectId}.` }],
    }
  },
)

server.registerTool(
  'linear_list_project_issues',
  {
    description: 'List issues in a project',
    inputSchema: {
      projectId: z.string().describe('Project ID to list issues for'),
    },
  },
  async ({ projectId }) => {
    const project = await withRetry((client) => client.project(projectId))
    const issues = await project.issues({ first: 50 })
    const summary = issues.nodes
      .map((i) => `${i.identifier}: ${i.title} [${i.state ? 'stateful' : 'unknown'}] (P${i.priority})`)
      .join('\n')
    return {
      content: [{ type: 'text' as const, text: summary || 'No issues found.' }],
    }
  },
)

server.registerTool(
  'linear_get_project',
  {
    description: 'Get detailed information about a Linear project',
    inputSchema: {
      projectId: z.string().describe('Project ID'),
    },
  },
  async ({ projectId }) => {
    const project = await withRetry((client) => client.project(projectId))
    const text = [
      `${project.name} (${project.id})`,
      `State: ${project.state}`,
      `Progress: ${Math.round(project.progress * 100)}%`,
      project.targetDate ? `Target date: ${project.targetDate}` : '',
      `URL: ${project.url}`,
      project.description ? `\nDescription:\n${project.description}` : '',
    ].filter(Boolean).join('\n')
    return {
      content: [{ type: 'text' as const, text }],
    }
  },
)

// ── Workflow ──────────────────────────────────────────────────────

server.registerTool(
  'linear_search_issues',
  {
    description: 'Search and filter issues across the workspace',
    inputSchema: {
      teamId: z.string().optional().describe('Filter by team ID'),
      stateId: z.string().optional().describe('Filter by state ID'),
      assigneeId: z.string().optional().describe('Filter by assignee user ID'),
      labelId: z.string().optional().describe('Filter by label ID'),
      priority: z.number().optional().describe('Filter by priority (0=none, 1=urgent, 2=high, 3=medium, 4=low)'),
      query: z.string().optional().describe('Search by title (contains)'),
    },
  },
  async ({ teamId, stateId, assigneeId, labelId, priority, query }) => {
    const filter: Record<string, unknown> = {}
    if (teamId) filter.team = { id: { eq: teamId } }
    if (stateId) filter.state = { id: { eq: stateId } }
    if (assigneeId) filter.assignee = { id: { eq: assigneeId } }
    if (labelId) filter.labels = { id: { eq: labelId } }
    if (priority !== undefined) filter.priority = { eq: priority }
    if (query) filter.title = { contains: query }

    const issues = await withRetry((client) =>
      client.issues({ first: 50, filter }),
    )
    const summary = issues.nodes
      .map((i) => `${i.identifier}: ${i.title} [${i.state ? 'stateful' : 'unknown'}] (P${i.priority})`)
      .join('\n')
    return {
      content: [{ type: 'text' as const, text: summary || 'No issues found.' }],
    }
  },
)

const transport = new StdioServerTransport()
await server.connect(transport)
