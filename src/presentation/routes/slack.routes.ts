import { App } from '@slack/bolt'
import type { AgentEvent } from '../../domain/entity/agent-event.ts'
import type { AgentRepository } from '../../data/repository/agent.repository.ts'
import type { HandleEventUseCase } from '../../domain/usecase/handle-event.use-case.ts'

export class SlackRoutes {
  private readonly apps: Map<string, App> = new Map()

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly handleEventUseCase: HandleEventUseCase,
  ) {}

  async start(): Promise<void> {
    const agents = this.agentRepository.getAllAgents()

    for (const agent of agents) {
      if (!agent.slack) continue

      const app = new App({
        token: agent.slack.botToken,
        appToken: agent.slack.appToken,
        socketMode: true,
      })

      app.message(async ({ message }) => {
        if (message.subtype !== undefined) return

        const threadTs = ('thread_ts' in message ? message.thread_ts : undefined) ?? message.ts

        const event: AgentEvent = {
          id: crypto.randomUUID(),
          trigger: { type: 'slack', channelId: message.channel, threadTs, userId: message.user! },
          agentId: agent.id,
          message: 'text' in message ? message.text ?? '' : '',
          timestamp: new Date().toISOString(),
        }

        await this.handleEventUseCase.execute(event)
      })

      app.event('app_mention', async ({ event: mentionEvent }) => {
        const threadTs = mentionEvent.thread_ts ?? mentionEvent.ts

        const event: AgentEvent = {
          id: crypto.randomUUID(),
          trigger: { type: 'slack', channelId: mentionEvent.channel, threadTs, userId: mentionEvent.user },
          agentId: agent.id,
          message: mentionEvent.text ?? '',
          timestamp: new Date().toISOString(),
        }

        await this.handleEventUseCase.execute(event)
      })

      await app.start()
      this.apps.set(agent.id, app)
      console.log(`Slack bot started: ${agent.id}`)
    }
  }

  async stop(): Promise<void> {
    for (const [id, app] of this.apps) {
      await app.stop()
      console.log(`Slack bot stopped: ${id}`)
    }
    this.apps.clear()
  }
}
