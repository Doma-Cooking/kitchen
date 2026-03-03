import { Queue, Worker } from 'bullmq'
import type { AgentEvent } from '../../domain/entity/agent-event.ts'
import type { AgentRepository } from './agent.repository.ts'
import type { AgentMessage } from '../../domain/entity/agent-message.ts'
import type { ClaudeSource } from '../source/claude.source.ts'
import type { ConfigRepository } from './config.repository.ts'

const QUEUE_NAME = 'agent-events'

export class EventRepository {
  private readonly queue: Queue
  private readonly workers: Worker[]

  constructor(
    private readonly configRepository: ConfigRepository,
    private readonly agentRepository: AgentRepository,
    private readonly claudeSource: ClaudeSource,
  ) {
    const config = this.configRepository.getConfig()

    this.queue = new Queue(QUEUE_NAME, {
      connection: { url: config.redis.url },
    })

    this.workers = this.createWorkers(config.workers, config.redis.url)
  }

  getQueue(): Queue {
    return this.queue
  }

  private createWorkers(count: number, redisUrl: string): Worker[] {
    const config = this.configRepository.getConfig()

    return Array.from({ length: count }, () =>
      new Worker(
        QUEUE_NAME,
        async (job) => {
          const event: AgentEvent = job.data

          const agentId = event.agentId || config.agents.defaultAgent

          const agentConfig = this.agentRepository.getAgentConfig(agentId)
          if (agentConfig === undefined) {
            throw new Error(`No agent config found for agent: ${agentId}`)
          }

          const response = await this.claudeSource.invokeAgent(
            event.message,
            agentConfig.pluginPaths,
            (msg: AgentMessage) => {
              job.log(`[${msg.category}:${msg.type}] ${msg.content}`)
            },
          )

          return response
        },
        {
          connection: { url: redisUrl },
        },
      )
    )
  }

  async enqueueEvent(event: AgentEvent): Promise<string> {
    const job = await this.queue.add('agent-event', event, { jobId: event.id })
    if (job.id === undefined) {
      throw new Error('Failed to enqueue event: event ID is undefined')
    }
    return job.id
  }

  async closeWorkers(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.close()))
  }
}
