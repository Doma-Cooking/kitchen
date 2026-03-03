import { serve } from '@hono/node-server'
import { configRepository, agentRepository, eventRepository, slackRoutes, server } from './dependencies.ts'

const config = configRepository.getConfig()
const app = server.createApp()

const httpServer = serve({ fetch: app.fetch, port: config.port })
await slackRoutes.start()

const agents = agentRepository.getAllAgents()
console.log(`Kitchen server started on port ${config.port}`)
console.log(`Redis URL: ${config.redis.url}`)
console.log(`Registered agents: ${agents.map((a) => a.id).join(', ')}`)

async function shutdown(): Promise<void> {
  console.log('Shutting down...')
  await slackRoutes.stop()
  await eventRepository.closeWorkers()
  httpServer.close(() => {
    process.exit(0)
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
