#!/usr/bin/env npx tsx

import { Command } from 'commander'
import { Queue } from 'bullmq'

const program = new Command()
  .name('kitchen-tools')
  .description('Kitchen internal tools CLI')

program
  .command('create-agent-event')
  .description('Create an event to trigger an agent. Use this to delegate work or send messages to other agents or yourself in the kitchen.')
  .requiredOption('--agentId <id>', 'Target agent ID to invoke')
  .requiredOption('--message <text>', 'The prompt/message for the target agent')
  .option('--stationId <id>', 'Optional station session ID to resume a previous conversation')
  .option('--data <json>', 'Arbitrary data to include in the prompt/message (JSON object)', '{}')
  .option('--delay <seconds>', 'Delay in seconds before the event is processed', parseInt)
  .action(async (opts) => {
    try {
      const redisUrl = process.env['REDIS_URL']
      if (!redisUrl) throw new Error('REDIS_URL environment variable is required')

      const queue = new Queue('agent-events', { connection: { url: redisUrl } })

      const event = {
        id: crypto.randomUUID(),
        trigger: { type: 'agent' as const, data: JSON.parse(opts.data) },
        agentId: opts.agentId,
        stationId: opts.stationId,
        message: opts.message,
        timestamp: new Date().toISOString(),
      }

      await queue.add('agent-event', event, { jobId: event.id, delay: opts.delay ? opts.delay * 1000 : undefined })
      await queue.close()

      console.log(`Event ${event.id} created for agent "${opts.agentId}"`)
    } catch (e) {
      console.error((e as Error).message)
      process.exit(1)
    }
  })

await program.parseAsync()
