import { Queue, Worker } from 'bullmq'
import type { AgentEvent } from '../../domain/entity/agent-event.ts'
import { triggerToString } from '../../domain/entity/event-trigger.ts'
import type { AgentRepository } from './agent.repository.ts'
import type { AgentMessage } from '../../domain/entity/agent-message.ts'
import type { ClaudeSource } from '../source/claude.source.ts'
import type { ConfigRepository } from './config.repository.ts'
import type { MemoryRepository } from './memory.repository.ts'

const QUEUE_NAME = 'agent-events'

export class EventRepository {
  private readonly queue: Queue
  private readonly workers: Worker[]

  constructor(
    private readonly configRepository: ConfigRepository,
    private readonly agentRepository: AgentRepository,
    private readonly claudeSource: ClaudeSource,
    private readonly memoryRepository: MemoryRepository,
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

          const prefix = triggerToString(event.trigger)
          const prompt = prefix ? `${prefix}\n${event.message}` : event.message
          const env: Record<string, string> = { CLAUDE_CONFIG_DIR: config.claudeConfigDir }
          if (agentConfig.slack) {
            env.SLACK_BOT_TOKEN = agentConfig.slack.botToken
            if (agentConfig.slack.userToken) env.SLACK_USER_TOKEN = agentConfig.slack.userToken
          }
          if (agentConfig.github) {
            if (agentConfig.github.mode === 'app') {
              env.GITHUB_APP_ID = agentConfig.github.appId
              env.GITHUB_PRIVATE_KEY = agentConfig.github.privateKey
              env.GITHUB_INSTALLATION_ID = agentConfig.github.installationId
            } else {
              env.GITHUB_TOKEN = agentConfig.github.token
            }
          }
          if (agentConfig.linear) {
            env.LINEAR_CLIENT_ID = agentConfig.linear.clientId
            env.LINEAR_CLIENT_SECRET = agentConfig.linear.clientSecret
          }
          if (agentConfig.notion) {
            env.NOTION_TOKEN = agentConfig.notion.token
          }

          const memoryId = event.memoryId ?? agentId
          const memory = await this.memoryRepository.getMemory(memoryId)

          const { result, sessionId } = await this.claudeSource.invokeAgent(
            prompt,
            agentConfig.pluginPaths,
            agentConfig.agentPrompt,
            (msg: AgentMessage) => {
              job.log(`[${msg.category}:${msg.type}] ${msg.content}`)
            },
            env,
            memory?.sessionId,
            config.maxTurns,
          )

          if (sessionId) await this.memoryRepository.setMemory(memoryId, { sessionId })

          return { result, sessionId }
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
