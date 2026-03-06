import { Queue, Worker, DelayedError } from 'bullmq'
import type { AgentEvent } from '../../domain/entity/agent-event.ts'
import { triggerToString } from '../../domain/entity/event-trigger.ts'
import { agentConfigToEnv } from '../../domain/entity/agent-config.ts'
import { defaultLockKeyResolver } from '../../domain/entity/lock-key.ts'
import { RedisLock } from '../source/redis-lock.source.ts'
import type { AgentRepository } from './agent.repository.ts'
import type { AgentMessage } from '../../domain/entity/agent-message.ts'
import type { ClaudeSource } from '../source/claude.source.ts'
import type { ConfigRepository } from './config.repository.ts'
import type { StationRepository } from './station.repository.ts'

const QUEUE_NAME = 'agent-events'

export class EventRepository {
  private readonly queue: Queue
  private readonly workers: Worker[]
  private readonly redisLock: RedisLock
  private readonly activeLocks = new Map<string, { keys: string[]; tokens: string[] }>()

  constructor(
    private readonly configRepository: ConfigRepository,
    private readonly agentRepository: AgentRepository,
    private readonly claudeSource: ClaudeSource,
    private readonly stationRepository: StationRepository,
  ) {
    const config = this.configRepository.getConfig()

    this.queue = new Queue(QUEUE_NAME, {
      connection: { url: config.redis.url },
    })

    this.redisLock = new RedisLock(config.redis.url)
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

          const lockKeys = defaultLockKeyResolver(event, config.agents.defaultAgent)
          const tokens = await this.redisLock.acquireAll(lockKeys, config.lockTtlSeconds)

          if (tokens === null) {
            await job.moveToDelayed(Date.now() + config.lockRetryIntervalMs)
            throw new DelayedError()
          }

          const lockId = job.id ?? crypto.randomUUID()
          this.activeLocks.set(lockId, { keys: lockKeys, tokens })

          try {
            const agentConfig = this.agentRepository.getAgentConfig(agentId)
            if (agentConfig === undefined) {
              throw new Error(`No agent config found for agent: ${agentId}`)
            }

            const prefix = triggerToString(event.trigger)
            const prompt = prefix ? `${prefix}\n${event.message}` : event.message
            const env: Record<string, string> = {
              CLAUDE_CONFIG_DIR: config.claudeConfigDir,
              REDIS_URL: config.redis.url,
              ...agentConfigToEnv(agentConfig),
            }

            const stationId = event.stationId ?? agentId
            const station = await this.stationRepository.getStation(stationId)

            const { result, sessionId } = await this.claudeSource.invokeAgent(
              prompt,
              agentConfig.pluginPaths,
              agentConfig.agentPrompt,
              (msg: AgentMessage) => {
                job.log(`[${msg.category}:${msg.type}] ${msg.content}`)
              },
              env,
              station?.sessionId,
              config.maxTurns,
            )

            if (sessionId) await this.stationRepository.setStation(stationId, { sessionId })

            return { result, sessionId }
          } finally {
            await this.redisLock.releaseAll(lockKeys, tokens)
            this.activeLocks.delete(lockId)
          }
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
    // Release any active locks before closing workers
    for (const [, { keys, tokens }] of this.activeLocks) {
      await this.redisLock.releaseAll(keys, tokens)
    }
    this.activeLocks.clear()

    await Promise.all(this.workers.map((w) => w.close()))
    await this.redisLock.close()
  }
}
