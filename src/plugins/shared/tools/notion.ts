#!/usr/bin/env npx tsx

import { Command } from 'commander'
import { Client } from '@notionhq/client'

function getClient(): Client {
  const token = process.env['NOTION_TOKEN']
  if (!token) throw new Error('NOTION_TOKEN must be set')
  return new Client({ auth: token })
}

function fail(e: unknown): never {
  console.error((e as Error).message)
  process.exit(1)
}

const program = new Command()
  .name('kitchen-notion')
  .description('Notion tools CLI. NOTE: Do not run subcommands in parallel — a single failure cascades to all siblings.')

program
  .command('search')
  .description('Search pages and databases by query. NOTE: Each database has two IDs — top-level "id" is data_source_id (for query-database), "url" field contains URL-based database ID (for get-database/create-page). NOT interchangeable.')
  .option('--query <text>', 'Search query text')
  .option('--filter <type>', 'Filter by object type: page or data_source')
  .option('--pageSize <number>', 'Number of results (max 100)', parseInt)
  .option('--startCursor <cursor>', 'Pagination cursor')
  .action(async (opts) => {
    try {
      const results = await getClient().search({
        query: opts.query,
        filter: opts.filter ? { value: opts.filter, property: 'object' } : undefined,
        page_size: opts.pageSize,
        start_cursor: opts.startCursor,
      })
      console.log(JSON.stringify(results, null, 2))
    } catch (e) { fail(e) }
  })

program
  .command('get-page')
  .description('Get a page by ID')
  .requiredOption('--pageId <id>', 'Page ID')
  .action(async (opts) => {
    try {
      const page = await getClient().pages.retrieve({ page_id: opts.pageId })
      console.log(JSON.stringify(page, null, 2))
    } catch (e) { fail(e) }
  })

program
  .command('create-page')
  .description('Create a page in a database or as a child of another page')
  .option('--parentDatabaseId <id>', 'URL-based database ID (mutually exclusive with parentPageId)')
  .option('--parentPageId <id>', 'Parent page ID (mutually exclusive with parentDatabaseId)')
  .requiredOption('--properties <json>', 'Page properties object (JSON)')
  .option('--children <json>', 'Block children to add as page content (JSON array)')
  .action(async (opts) => {
    try {
      let parent: { database_id: string } | { page_id: string }
      if (opts.parentDatabaseId) {
        parent = { database_id: opts.parentDatabaseId }
      } else if (opts.parentPageId) {
        parent = { page_id: opts.parentPageId }
      } else {
        throw new Error('Either --parentDatabaseId or --parentPageId is required')
      }
      const page = await getClient().pages.create({
        parent,
        properties: JSON.parse(opts.properties),
        children: opts.children ? JSON.parse(opts.children) : undefined,
      } as Parameters<typeof Client.prototype.pages.create>[0])
      console.log(JSON.stringify(page, null, 2))
    } catch (e) { fail(e) }
  })

program
  .command('update-page')
  .description('Update page properties')
  .requiredOption('--pageId <id>', 'Page ID')
  .requiredOption('--properties <json>', 'Properties to update (JSON)')
  .action(async (opts) => {
    try {
      const page = await getClient().pages.update({
        page_id: opts.pageId,
        properties: JSON.parse(opts.properties),
      } as Parameters<typeof Client.prototype.pages.update>[0])
      console.log(JSON.stringify(page, null, 2))
    } catch (e) { fail(e) }
  })

program
  .command('get-database')
  .description('Get a database schema by ID. IMPORTANT: Use the URL-based database ID (from "url" field in search results or parent.database_id), NOT the data_source_id.')
  .requiredOption('--databaseId <id>', 'URL-based database ID')
  .action(async (opts) => {
    try {
      const db = await getClient().databases.retrieve({ database_id: opts.databaseId })
      console.log(JSON.stringify(db, null, 2))
    } catch (e) { fail(e) }
  })

program
  .command('query-database')
  .description('Query a database with optional filters and sorts. IMPORTANT: Use the data_source_id (top-level "id" from search results), NOT the URL-based database ID.')
  .requiredOption('--databaseId <id>', 'data_source_id — the top-level "id" from search results')
  .option('--filter <json>', 'Notion filter object (JSON)')
  .option('--sorts <json>', 'Notion sorts array (JSON)')
  .option('--pageSize <number>', 'Number of results (max 100)', parseInt)
  .option('--startCursor <cursor>', 'Pagination cursor')
  .action(async (opts) => {
    try {
      const results = await getClient().dataSources.query({
        data_source_id: opts.databaseId,
        filter: opts.filter ? JSON.parse(opts.filter) : undefined,
        sorts: opts.sorts ? JSON.parse(opts.sorts) : undefined,
        page_size: opts.pageSize,
        start_cursor: opts.startCursor,
      })
      console.log(JSON.stringify(results, null, 2))
    } catch (e) { fail(e) }
  })

program
  .command('get-block-children')
  .description('Get child blocks of a page or block (read page content)')
  .requiredOption('--blockId <id>', 'Block or page ID')
  .option('--pageSize <number>', 'Number of results (max 100)', parseInt)
  .option('--startCursor <cursor>', 'Pagination cursor')
  .action(async (opts) => {
    try {
      const results = await getClient().blocks.children.list({
        block_id: opts.blockId,
        page_size: opts.pageSize,
        start_cursor: opts.startCursor,
      })
      console.log(JSON.stringify(results, null, 2))
    } catch (e) { fail(e) }
  })

program
  .command('append-blocks')
  .description('Append block children to a page or block (write content)')
  .requiredOption('--blockId <id>', 'Block or page ID to append to')
  .requiredOption('--children <json>', 'Array of block objects to append (JSON)')
  .action(async (opts) => {
    try {
      const results = await getClient().blocks.children.append({
        block_id: opts.blockId,
        children: JSON.parse(opts.children),
      })
      console.log(JSON.stringify(results, null, 2))
    } catch (e) { fail(e) }
  })

program
  .command('delete-block')
  .description('Delete (archive) a block')
  .requiredOption('--blockId <id>', 'Block ID to delete')
  .action(async (opts) => {
    try {
      const result = await getClient().blocks.delete({ block_id: opts.blockId })
      console.log(JSON.stringify(result, null, 2))
    } catch (e) { fail(e) }
  })

program
  .command('create-comment')
  .description('Add a comment to a page or discussion')
  .requiredOption('--richText <json>', 'Rich text array for the comment body (JSON)')
  .option('--parentPageId <id>', 'Page ID to comment on (creates a new discussion)')
  .option('--discussionId <id>', 'Discussion thread ID to reply to')
  .action(async (opts) => {
    try {
      const params: Record<string, unknown> = { rich_text: JSON.parse(opts.richText) }
      if (opts.parentPageId) params.parent = { page_id: opts.parentPageId }
      if (opts.discussionId) params.discussion_id = opts.discussionId
      const result = await getClient().comments.create(params as Parameters<typeof Client.prototype.comments.create>[0])
      console.log(JSON.stringify(result, null, 2))
    } catch (e) { fail(e) }
  })

program
  .command('get-comments')
  .description('Get comments on a page or block')
  .requiredOption('--blockId <id>', 'Block or page ID')
  .option('--pageSize <number>', 'Number of results (max 100)', parseInt)
  .option('--startCursor <cursor>', 'Pagination cursor')
  .action(async (opts) => {
    try {
      const results = await getClient().comments.list({
        block_id: opts.blockId,
        page_size: opts.pageSize,
        start_cursor: opts.startCursor,
      })
      console.log(JSON.stringify(results, null, 2))
    } catch (e) { fail(e) }
  })

await program.parseAsync()
