#!/usr/bin/env npx tsx

import { Command } from 'commander'
import { Octokit } from '@octokit/rest'
import { createAppAuth } from '@octokit/auth-app'
import fs from 'node:fs'

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

async function getOctokit(): Promise<Octokit> {
  const appId = process.env['GITHUB_APP_ID']
  const privateKey = process.env['GITHUB_PRIVATE_KEY']
  const installationId = process.env['GITHUB_INSTALLATION_ID']

  if (appId && privateKey && installationId) {
    const cached = readCache()
    if (cached.github && cached.github.expiresAt > Date.now() + 60_000) {
      return new Octokit({ auth: cached.github.token })
    }
    const authFn = createAppAuth({ appId, privateKey, installationId })
    const { token, expiresAt } = await authFn({ type: 'installation' })
    const updated = readCache()
    updated.github = { token, expiresAt: new Date(expiresAt).getTime() }
    writeCache(updated)
    return new Octokit({ auth: token })
  }

  const token = process.env['GITHUB_TOKEN']
  if (token) return new Octokit({ auth: token })

  throw new Error('GitHub auth not configured: set GITHUB_TOKEN or GITHUB_APP_ID + GITHUB_PRIVATE_KEY + GITHUB_INSTALLATION_ID')
}

function out(text: string) { console.log(text) }
function fail(e: unknown): never {
  console.error((e as Error).message)
  process.exit(1)
}

const program = new Command()
  .name('kitchen-github')
  .description('GitHub tools CLI')

program
  .command('create-pull-request')
  .description('Create a pull request on a GitHub repository')
  .requiredOption('--owner <owner>', 'Repository owner (user or org)')
  .requiredOption('--repo <repo>', 'Repository name')
  .requiredOption('--title <title>', 'PR title')
  .requiredOption('--body <body>', 'PR description')
  .requiredOption('--head <head>', 'Branch containing changes')
  .requiredOption('--base <base>', 'Branch to merge into')
  .action(async (opts) => {
    try {
      const octokit = await getOctokit()
      const { data } = await octokit.pulls.create({ owner: opts.owner, repo: opts.repo, title: opts.title, body: opts.body, head: opts.head, base: opts.base })
      out(`PR #${data.number} created: ${data.html_url}`)
    } catch (e) { fail(e) }
  })

program
  .command('list-pull-requests')
  .description('List pull requests on a GitHub repository')
  .requiredOption('--owner <owner>', 'Repository owner (user or org)')
  .requiredOption('--repo <repo>', 'Repository name')
  .option('--state <state>', 'Filter by state: open, closed, all', 'open')
  .action(async (opts) => {
    try {
      const octokit = await getOctokit()
      const { data } = await octokit.pulls.list({ owner: opts.owner, repo: opts.repo, state: opts.state })
      out(data.map((pr) => `#${pr.number} ${pr.title} (${pr.state})`).join('\n') || 'No pull requests found.')
    } catch (e) { fail(e) }
  })

program
  .command('get-pull-request')
  .description('Get details of a specific pull request')
  .requiredOption('--owner <owner>', 'Repository owner (user or org)')
  .requiredOption('--repo <repo>', 'Repository name')
  .requiredOption('--pullNumber <number>', 'PR number', parseInt)
  .action(async (opts) => {
    try {
      const octokit = await getOctokit()
      const { data } = await octokit.pulls.get({ owner: opts.owner, repo: opts.repo, pull_number: opts.pullNumber })
      out([
        `#${data.number}: ${data.title}`,
        `State: ${data.state} | Mergeable: ${data.mergeable ?? 'unknown'}`,
        `Author: ${data.user?.login} | Base: ${data.base.ref} ← Head: ${data.head.ref}`,
        `Changed files: ${data.changed_files} | +${data.additions} -${data.deletions}`,
        '',
        data.body ?? '(no description)',
      ].join('\n'))
    } catch (e) { fail(e) }
  })

program
  .command('add-pr-comment')
  .description('Add a comment to a pull request')
  .requiredOption('--owner <owner>', 'Repository owner (user or org)')
  .requiredOption('--repo <repo>', 'Repository name')
  .requiredOption('--pullNumber <number>', 'PR number', parseInt)
  .requiredOption('--body <body>', 'Comment body')
  .action(async (opts) => {
    try {
      const octokit = await getOctokit()
      const { data } = await octokit.issues.createComment({ owner: opts.owner, repo: opts.repo, issue_number: opts.pullNumber, body: opts.body })
      out(`Comment added: ${data.html_url}`)
    } catch (e) { fail(e) }
  })

program
  .command('get-pr-diff')
  .description('Get the raw diff of a pull request')
  .requiredOption('--owner <owner>', 'Repository owner (user or org)')
  .requiredOption('--repo <repo>', 'Repository name')
  .requiredOption('--pullNumber <number>', 'PR number', parseInt)
  .action(async (opts) => {
    try {
      const octokit = await getOctokit()
      const { data } = await octokit.pulls.get({ owner: opts.owner, repo: opts.repo, pull_number: opts.pullNumber, mediaType: { format: 'diff' } })
      out(data as unknown as string)
    } catch (e) { fail(e) }
  })

program
  .command('list-pr-reviews')
  .description('List reviews on a pull request')
  .requiredOption('--owner <owner>', 'Repository owner (user or org)')
  .requiredOption('--repo <repo>', 'Repository name')
  .requiredOption('--pullNumber <number>', 'PR number', parseInt)
  .action(async (opts) => {
    try {
      const octokit = await getOctokit()
      const { data } = await octokit.pulls.listReviews({ owner: opts.owner, repo: opts.repo, pull_number: opts.pullNumber })
      out(data.map((r) => `${r.user?.login}: ${r.state} (${r.submitted_at})`).join('\n') || 'No reviews found.')
    } catch (e) { fail(e) }
  })

program
  .command('get-pr-review-comments')
  .description('Get inline review comments on a pull request')
  .requiredOption('--owner <owner>', 'Repository owner (user or org)')
  .requiredOption('--repo <repo>', 'Repository name')
  .requiredOption('--pullNumber <number>', 'PR number', parseInt)
  .action(async (opts) => {
    try {
      const octokit = await getOctokit()
      const { data } = await octokit.pulls.listReviewComments({ owner: opts.owner, repo: opts.repo, pull_number: opts.pullNumber })
      out(data.map((c) => `[${c.path}:${c.line ?? '?'}] ${c.user?.login}: ${c.body}`).join('\n\n') || 'No review comments found.')
    } catch (e) { fail(e) }
  })

program
  .command('request-reviewers')
  .description('Request reviewers for a pull request')
  .requiredOption('--owner <owner>', 'Repository owner (user or org)')
  .requiredOption('--repo <repo>', 'Repository name')
  .requiredOption('--pullNumber <number>', 'PR number', parseInt)
  .option('--reviewers <json>', 'GitHub usernames to request (JSON array)', '[]')
  .option('--teamReviewers <json>', 'Team slugs to request (JSON array)', '[]')
  .action(async (opts) => {
    try {
      const octokit = await getOctokit()
      await octokit.pulls.requestReviewers({
        owner: opts.owner,
        repo: opts.repo,
        pull_number: opts.pullNumber,
        reviewers: JSON.parse(opts.reviewers),
        team_reviewers: JSON.parse(opts.teamReviewers),
      })
      out(`Reviewers requested for PR #${opts.pullNumber}`)
    } catch (e) { fail(e) }
  })

program
  .command('get-file-contents')
  .description('Get the contents of a file or list a directory from a GitHub repository')
  .requiredOption('--owner <owner>', 'Repository owner (user or org)')
  .requiredOption('--repo <repo>', 'Repository name')
  .requiredOption('--path <path>', 'File or directory path')
  .option('--ref <ref>', 'Git ref (branch, tag, or SHA)')
  .action(async (opts) => {
    try {
      const octokit = await getOctokit()
      const { data } = await octokit.repos.getContent({ owner: opts.owner, repo: opts.repo, path: opts.path, ref: opts.ref })
      if (Array.isArray(data)) {
        out(data.map((item) => `${item.type}\t${item.name}`).join('\n'))
      } else if ('content' in data && data.encoding === 'base64') {
        out(Buffer.from(data.content, 'base64').toString('utf-8'))
      } else {
        out(JSON.stringify(data))
      }
    } catch (e) { fail(e) }
  })

program
  .command('list-workflow-runs')
  .description('List recent workflow runs (CI/CD) for a repository')
  .requiredOption('--owner <owner>', 'Repository owner (user or org)')
  .requiredOption('--repo <repo>', 'Repository name')
  .option('--branch <branch>', 'Filter by branch name')
  .option('--status <status>', 'Filter by status')
  .option('--perPage <number>', 'Results per page (default 10)', parseInt)
  .action(async (opts) => {
    try {
      const octokit = await getOctokit()
      const { data } = await octokit.actions.listWorkflowRunsForRepo({ owner: opts.owner, repo: opts.repo, branch: opts.branch, status: opts.status, per_page: opts.perPage ?? 10 })
      out(data.workflow_runs.map((r) => `#${r.id} ${r.name} (${r.status}/${r.conclusion ?? 'pending'}) — ${r.head_branch} — ${r.created_at}`).join('\n') || 'No workflow runs found.')
    } catch (e) { fail(e) }
  })

program
  .command('list-branches')
  .description('List branches in a GitHub repository')
  .requiredOption('--owner <owner>', 'Repository owner (user or org)')
  .requiredOption('--repo <repo>', 'Repository name')
  .option('--perPage <number>', 'Results per page (default 30)', parseInt)
  .action(async (opts) => {
    try {
      const octokit = await getOctokit()
      const { data } = await octokit.repos.listBranches({ owner: opts.owner, repo: opts.repo, per_page: opts.perPage ?? 30 })
      out(data.map((b) => `${b.name}${b.protected ? ' (protected)' : ''}`).join('\n') || 'No branches found.')
    } catch (e) { fail(e) }
  })

await program.parseAsync()
