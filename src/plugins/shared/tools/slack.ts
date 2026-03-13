#!/usr/bin/env node

import { Command } from 'commander'
import { WebClient } from '@slack/web-api'
import { MessageElement } from '@slack/web-api/dist/types/response/ConversationsHistoryResponse.js'

type SlackTokenType = 'bot' | 'user'

const TOKEN_ENV: Record<SlackTokenType, string> = {
  bot: 'SLACK_BOT_TOKEN',
  user: 'SLACK_USER_TOKEN',
}

function getClient(tokenType: SlackTokenType): WebClient {
  const envVar = TOKEN_ENV[tokenType]
  const token = process.env[envVar]
  if (!token) throw new Error(`${envVar} not set`)
  return new WebClient(token)
}

function formatMessage(m: MessageElement): string {
  let line = `[${m.ts}] <${m.user}>: ${m.text}`
  if (m.files?.length) {
    line += ` [files: ${m.files.map((f: any) => `${f.name} (${f.mimetype})`).join(', ')}]`
  }
  return line
}

function fail(e: unknown): never {
  console.error((e as Error).message)
  process.exit(1)
}

const program = new Command()
  .name('kitchen-slack')
  .description('Slack tools CLI')

program
  .command('send-message')
  .description('Send a message to a Slack channel or thread')
  .requiredOption('--channel <id>', 'Slack channel ID')
  .requiredOption('--text <text>', 'Message text to send')
  .option('--threadTs <ts>', 'Thread timestamp to reply in. Omit to post at top level.')
  .action(async (opts) => {
    try {
      const client = getClient('bot')
      await client.chat.postMessage({ channel: opts.channel, thread_ts: opts.threadTs, text: opts.text })
      const target = opts.threadTs ? `thread ${opts.threadTs} in ${opts.channel}` : opts.channel
      console.log(`Message sent to ${target}`)
    } catch (e) { fail(e) }
  })

program
  .command('add-reaction')
  .description('Add an emoji reaction to a Slack message')
  .requiredOption('--channel <id>', 'Slack channel ID')
  .requiredOption('--timestamp <ts>', 'Timestamp of the message to react to')
  .requiredOption('--name <emoji>', 'Emoji name without colons (e.g. thumbsup)')
  .action(async (opts) => {
    try {
      const client = getClient('bot')
      await client.reactions.add({ channel: opts.channel, timestamp: opts.timestamp, name: opts.name })
      console.log(`Reacted with :${opts.name}: in ${opts.channel}`)
    } catch (e) { fail(e) }
  })

program
  .command('get-thread-replies')
  .description('Get all replies in a Slack thread')
  .requiredOption('--channel <id>', 'Slack channel ID')
  .requiredOption('--threadTs <ts>', 'Timestamp of the parent message')
  .option('--limit <number>', 'Max replies to return (default 100)', parseInt)
  .action(async (opts) => {
    try {
      const client = getClient('bot')
      const result = await client.conversations.replies({ channel: opts.channel, ts: opts.threadTs, limit: opts.limit ?? 100 })
      console.log((result.messages ?? []).map(formatMessage).join('\n') || 'No replies found.')
    } catch (e) { fail(e) }
  })

program
  .command('get-channel-history')
  .description('Get recent messages from a Slack channel')
  .requiredOption('--channel <id>', 'Slack channel ID')
  .option('--limit <number>', 'Max messages to return (default 20)', parseInt)
  .option('--oldest <ts>', 'Only messages after this Unix timestamp')
  .option('--latest <ts>', 'Only messages before this Unix timestamp')
  .action(async (opts) => {
    try {
      const client = getClient('bot')
      const result = await client.conversations.history({ channel: opts.channel, limit: opts.limit ?? 20, oldest: opts.oldest, latest: opts.latest })
      console.log((result.messages ?? []).map(formatMessage).join('\n') || 'No messages found.')
    } catch (e) { fail(e) }
  })

program
  .command('get-message')
  .description('Get a single Slack message by timestamp, including file attachments and full metadata')
  .requiredOption('--channel <id>', 'Slack channel ID')
  .requiredOption('--ts <ts>', 'Timestamp of the message to fetch')
  .action(async (opts) => {
    try {
      const client = getClient('bot')
      const result = await client.conversations.history({ channel: opts.channel, latest: opts.ts, inclusive: true, limit: 1 })
      const msg = result.messages?.[0]
      if (!msg) { console.log('Message not found.'); return }
      const parts = [`ts: ${msg.ts}`, `user: ${msg.user}`, `text: ${msg.text}`]
      if (msg.files?.length) parts.push(`files: ${msg.files.map((f) => `${f.name} (${f.mimetype}, ${f.url_private})`).join(', ')}`)
      if (msg.reactions?.length) parts.push(`reactions: ${msg.reactions.map((r) => `:${r.name}: (${r.count})`).join(', ')}`)
      console.log(parts.join('\n'))
    } catch (e) { fail(e) }
  })

program
  .command('search-messages')
  .description('Search for messages across the Slack workspace. Requires a user token (xoxp-).')
  .requiredOption('--query <query>', 'Search query string')
  .option('--count <number>', 'Max results to return (default 20)', parseInt)
  .option('--sort <sort>', 'Sort order: score or timestamp (default: score)', 'score')
  .action(async (opts) => {
    try {
      const client = getClient('user')
      const result = await client.search.messages({ query: opts.query, count: opts.count ?? 20, sort: opts.sort })
      const matches = (result.messages?.matches ?? [])
        .map((m) => `[${m.ts}] #${m.channel?.name ?? m.channel?.id} <${m.user}>: ${m.text}`)
        .join('\n')
      console.log(matches || 'No messages found.')
    } catch (e) { fail(e) }
  })

program
  .command('get-user-info')
  .description('Get information about a Slack user by their user ID')
  .requiredOption('--user <id>', 'Slack user ID (e.g. U01234ABCDE)')
  .action(async (opts) => {
    try {
      const client = getClient('bot')
      const result = await client.users.info({ user: opts.user })
      const u = result.user
      if (!u) { console.log('User not found.'); return }
      console.log([
        `Name: ${u.real_name ?? u.name}`,
        `Display name: ${u.profile?.display_name}`,
        `Title: ${u.profile?.title}`,
        `Email: ${u.profile?.email}`,
        `Is bot: ${u.is_bot}`,
        `Timezone: ${u.tz}`,
      ].join('\n'))
    } catch (e) { fail(e) }
  })

program
  .command('list-channels')
  .description('List Slack channels in the workspace')
  .option('--types <types>', 'Comma-separated channel types (default: public_channel)', 'public_channel')
  .option('--limit <number>', 'Max channels to return (default 100)', parseInt)
  .option('--excludeArchived', 'Exclude archived channels (default true)')
  .action(async (opts) => {
    try {
      const client = getClient('bot')
      const result = await client.conversations.list({ types: opts.types, limit: opts.limit ?? 100, exclude_archived: opts.excludeArchived !== false })
      console.log((result.channels ?? []).map((c) => `${c.id} #${c.name} — ${c.topic?.value || '(no topic)'}`).join('\n') || 'No channels found.')
    } catch (e) { fail(e) }
  })

program
  .command('update-message')
  .description('Update (edit) a previously sent Slack message')
  .requiredOption('--channel <id>', 'Slack channel ID')
  .requiredOption('--ts <ts>', 'Timestamp of the message to update')
  .requiredOption('--text <text>', 'New message text')
  .action(async (opts) => {
    try {
      const client = getClient('bot')
      await client.chat.update({ channel: opts.channel, ts: opts.ts, text: opts.text })
      console.log(`Message ${opts.ts} updated in ${opts.channel}`)
    } catch (e) { fail(e) }
  })

program
  .command('upload-file')
  .description('Upload a file to a Slack channel (from string content)')
  .requiredOption('--channelId <id>', 'Slack channel ID to upload to')
  .requiredOption('--content <text>', 'File content as a string')
  .requiredOption('--filename <name>', 'Filename (e.g. report.txt)')
  .option('--title <title>', 'Display title for the file')
  .option('--initialComment <text>', 'Message to include with the upload')
  .option('--threadTs <ts>', 'Thread timestamp to upload in')
  .action(async (opts) => {
    try {
      const client = getClient('bot')
      const shared = { channel_id: opts.channelId, content: opts.content, filename: opts.filename, title: opts.title, initial_comment: opts.initialComment } as const
      await client.filesUploadV2(opts.threadTs ? { ...shared, thread_ts: opts.threadTs } : shared)
      console.log(`File "${opts.filename}" uploaded to ${opts.channelId}`)
    } catch (e) { fail(e) }
  })

program
  .command('search-users')
  .description('Search for Slack users by name or email address')
  .requiredOption('--query <query>', 'Search query — matches against real name, display name, and email')
  .action(async (opts) => {
    try {
      const client = getClient('bot')
      const result = await client.users.list({})
      const q = opts.query.toLowerCase()
      const matches = (result.members ?? [])
        .filter((u) => !u.deleted && u.id !== 'USLACKBOT')
        .filter((u) => {
          const name = (u.real_name ?? '').toLowerCase()
          const display = (u.profile?.display_name ?? '').toLowerCase()
          const email = (u.profile?.email ?? '').toLowerCase()
          return name.includes(q) || display.includes(q) || email.includes(q)
        })
        .map((u) => [`ID: ${u.id}`, `Name: ${u.real_name ?? u.name}`, `Display name: ${u.profile?.display_name}`, `Title: ${u.profile?.title}`, `Email: ${u.profile?.email}`, `Is bot: ${u.is_bot}`, `Timezone: ${u.tz}`].join('\n'))
      console.log(matches.join('\n---\n') || 'No users found.')
    } catch (e) { fail(e) }
  })

program
  .command('set-channel-topic')
  .description('Set the topic of a Slack channel')
  .requiredOption('--channel <id>', 'Slack channel ID')
  .requiredOption('--topic <text>', 'New channel topic text')
  .action(async (opts) => {
    try {
      const client = getClient('bot')
      await client.conversations.setTopic({ channel: opts.channel, topic: opts.topic })
      console.log(`Topic set for ${opts.channel}`)
    } catch (e) { fail(e) }
  })

await program.parseAsync()
