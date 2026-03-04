#!/usr/bin/env npx tsx

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { Octokit } from '@octokit/rest'
import { createAppAuth } from '@octokit/auth-app'
import { z } from 'zod'

const server = new McpServer({
  name: 'github',
  version: '1.0.0',
})

function getOctokit(): Octokit {
  const appId = process.env['GITHUB_APP_ID']
  const privateKey = process.env['GITHUB_PRIVATE_KEY']
  const installationId = process.env['GITHUB_INSTALLATION_ID']

  if (appId && privateKey && installationId) {
    return new Octokit({
      authStrategy: createAppAuth,
      auth: { appId, privateKey, installationId },
    })
  }

  const token = process.env['GITHUB_TOKEN']
  if (token) return new Octokit({ auth: token })

  throw new Error('GitHub auth not configured: set GITHUB_TOKEN or GITHUB_APP_ID + GITHUB_PRIVATE_KEY + GITHUB_INSTALLATION_ID')
}

server.registerTool(
  'github_create_pull_request',
  {
    description: 'Create a pull request on a GitHub repository',
    inputSchema: {
      owner: z.string().describe('Repository owner (user or org)'),
      repo: z.string().describe('Repository name'),
      title: z.string().describe('PR title'),
      body: z.string().describe('PR description'),
      head: z.string().describe('Branch containing changes'),
      base: z.string().describe('Branch to merge into'),
    },
  },
  async ({ owner, repo, title, body, head, base }) => {
    const octokit = getOctokit()
    const { data } = await octokit.pulls.create({ owner, repo, title, body, head, base })
    return {
      content: [{ type: 'text' as const, text: `PR #${data.number} created: ${data.html_url}` }],
    }
  },
)

server.registerTool(
  'github_list_pull_requests',
  {
    description: 'List pull requests on a GitHub repository',
    inputSchema: {
      owner: z.string().describe('Repository owner (user or org)'),
      repo: z.string().describe('Repository name'),
      state: z.enum(['open', 'closed', 'all']).optional().describe('Filter by state (default: open)'),
    },
  },
  async ({ owner, repo, state }) => {
    const octokit = getOctokit()
    const { data } = await octokit.pulls.list({ owner, repo, state: state ?? 'open' })
    const summary = data.map((pr) => `#${pr.number} ${pr.title} (${pr.state})`).join('\n')
    return {
      content: [{ type: 'text' as const, text: summary || 'No pull requests found.' }],
    }
  },
)

server.registerTool(
  'github_get_pull_request',
  {
    description: 'Get details of a specific pull request',
    inputSchema: {
      owner: z.string().describe('Repository owner (user or org)'),
      repo: z.string().describe('Repository name'),
      pull_number: z.number().describe('PR number'),
    },
  },
  async ({ owner, repo, pull_number }) => {
    const octokit = getOctokit()
    const { data } = await octokit.pulls.get({ owner, repo, pull_number })
    const info = [
      `#${data.number}: ${data.title}`,
      `State: ${data.state} | Mergeable: ${data.mergeable ?? 'unknown'}`,
      `Author: ${data.user?.login} | Base: ${data.base.ref} ← Head: ${data.head.ref}`,
      `Changed files: ${data.changed_files} | +${data.additions} -${data.deletions}`,
      '',
      data.body ?? '(no description)',
    ].join('\n')
    return {
      content: [{ type: 'text' as const, text: info }],
    }
  },
)

server.registerTool(
  'github_add_pr_comment',
  {
    description: 'Add a comment to a pull request',
    inputSchema: {
      owner: z.string().describe('Repository owner (user or org)'),
      repo: z.string().describe('Repository name'),
      pull_number: z.number().describe('PR number'),
      body: z.string().describe('Comment body'),
    },
  },
  async ({ owner, repo, pull_number, body }) => {
    const octokit = getOctokit()
    const { data } = await octokit.issues.createComment({
      owner,
      repo,
      issue_number: pull_number,
      body,
    })
    return {
      content: [{ type: 'text' as const, text: `Comment added: ${data.html_url}` }],
    }
  },
)

server.registerTool(
  'github_get_pr_diff',
  {
    description: 'Get the raw diff of a pull request',
    inputSchema: {
      owner: z.string().describe('Repository owner (user or org)'),
      repo: z.string().describe('Repository name'),
      pull_number: z.number().describe('PR number'),
    },
  },
  async ({ owner, repo, pull_number }) => {
    const octokit = getOctokit()
    const { data } = await octokit.pulls.get({
      owner,
      repo,
      pull_number,
      mediaType: { format: 'diff' },
    })
    return {
      content: [{ type: 'text' as const, text: data as unknown as string }],
    }
  },
)

server.registerTool(
  'github_list_pr_reviews',
  {
    description: 'List reviews on a pull request',
    inputSchema: {
      owner: z.string().describe('Repository owner (user or org)'),
      repo: z.string().describe('Repository name'),
      pull_number: z.number().describe('PR number'),
    },
  },
  async ({ owner, repo, pull_number }) => {
    const octokit = getOctokit()
    const { data } = await octokit.pulls.listReviews({ owner, repo, pull_number })
    const summary = data
      .map((r) => `${r.user?.login}: ${r.state} (${r.submitted_at})`)
      .join('\n')
    return {
      content: [{ type: 'text' as const, text: summary || 'No reviews found.' }],
    }
  },
)

server.registerTool(
  'github_request_reviewers',
  {
    description: 'Request reviewers for a pull request',
    inputSchema: {
      owner: z.string().describe('Repository owner (user or org)'),
      repo: z.string().describe('Repository name'),
      pull_number: z.number().describe('PR number'),
      reviewers: z.array(z.string()).optional().describe('GitHub usernames to request'),
      team_reviewers: z.array(z.string()).optional().describe('Team slugs to request'),
    },
  },
  async ({ owner, repo, pull_number, reviewers, team_reviewers }) => {
    const octokit = getOctokit()
    await octokit.pulls.requestReviewers({
      owner,
      repo,
      pull_number,
      reviewers,
      team_reviewers,
    })
    return {
      content: [{ type: 'text' as const, text: `Reviewers requested for PR #${pull_number}` }],
    }
  },
)

server.registerTool(
  'github_merge_pull_request',
  {
    description: 'Merge a pull request',
    inputSchema: {
      owner: z.string().describe('Repository owner (user or org)'),
      repo: z.string().describe('Repository name'),
      pull_number: z.number().describe('PR number'),
      merge_method: z.enum(['merge', 'squash', 'rebase']).optional().describe('Merge method (default: merge)'),
      commit_title: z.string().optional().describe('Custom commit title'),
      commit_message: z.string().optional().describe('Custom commit message'),
    },
  },
  async ({ owner, repo, pull_number, merge_method, commit_title, commit_message }) => {
    const octokit = getOctokit()
    const { data } = await octokit.pulls.merge({
      owner,
      repo,
      pull_number,
      merge_method,
      commit_title,
      commit_message,
    })
    return {
      content: [{ type: 'text' as const, text: `PR #${pull_number} merged: ${data.message} (sha: ${data.sha})` }],
    }
  },
)

server.registerTool(
  'github_get_file_contents',
  {
    description: 'Get the contents of a file or list a directory from a GitHub repository',
    inputSchema: {
      owner: z.string().describe('Repository owner (user or org)'),
      repo: z.string().describe('Repository name'),
      path: z.string().describe('File or directory path'),
      ref: z.string().optional().describe('Git ref (branch, tag, or SHA)'),
    },
  },
  async ({ owner, repo, path, ref }) => {
    const octokit = getOctokit()
    const { data } = await octokit.repos.getContent({ owner, repo, path, ref })

    if (Array.isArray(data)) {
      const listing = data.map((item) => `${item.type}\t${item.name}`).join('\n')
      return { content: [{ type: 'text' as const, text: listing }] }
    }

    if ('content' in data && data.encoding === 'base64') {
      const decoded = Buffer.from(data.content, 'base64').toString('utf-8')
      return { content: [{ type: 'text' as const, text: decoded }] }
    }

    return { content: [{ type: 'text' as const, text: JSON.stringify(data) }] }
  },
)

server.registerTool(
  'github_list_workflow_runs',
  {
    description: 'List recent workflow runs (CI/CD) for a repository',
    inputSchema: {
      owner: z.string().describe('Repository owner (user or org)'),
      repo: z.string().describe('Repository name'),
      branch: z.string().optional().describe('Filter by branch name'),
      status: z.enum(['completed', 'action_required', 'cancelled', 'failure', 'neutral', 'skipped', 'stale', 'success', 'timed_out', 'in_progress', 'queued', 'requested', 'waiting', 'pending']).optional().describe('Filter by status'),
      per_page: z.number().optional().describe('Results per page (default 10)'),
    },
  },
  async ({ owner, repo, branch, status, per_page }) => {
    const octokit = getOctokit()
    const { data } = await octokit.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      branch,
      status,
      per_page: per_page ?? 10,
    })
    const summary = data.workflow_runs
      .map((r) => `#${r.id} ${r.name} (${r.status}/${r.conclusion ?? 'pending'}) — ${r.head_branch} — ${r.created_at}`)
      .join('\n')
    return {
      content: [{ type: 'text' as const, text: summary || 'No workflow runs found.' }],
    }
  },
)

server.registerTool(
  'github_list_branches',
  {
    description: 'List branches in a GitHub repository',
    inputSchema: {
      owner: z.string().describe('Repository owner (user or org)'),
      repo: z.string().describe('Repository name'),
      per_page: z.number().optional().describe('Results per page (default 30)'),
    },
  },
  async ({ owner, repo, per_page }) => {
    const octokit = getOctokit()
    const { data } = await octokit.repos.listBranches({ owner, repo, per_page: per_page ?? 30 })
    const summary = data
      .map((b) => `${b.name}${b.protected ? ' (protected)' : ''}`)
      .join('\n')
    return {
      content: [{ type: 'text' as const, text: summary || 'No branches found.' }],
    }
  },
)

const transport = new StdioServerTransport()
await server.connect(transport)
