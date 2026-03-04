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

const transport = new StdioServerTransport()
await server.connect(transport)
