import { App } from '@slack/bolt'
import type { AgentEvent } from '../../domain/entity/agent-event.ts'
import type { SlackMessage } from '../../domain/entity/event-trigger.ts'
import type { WebClient } from '@slack/web-api'
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

      app.message(async ({ message, client }) => {
        if (message.subtype !== undefined) return

        const threadTs = ('thread_ts' in message ? message.thread_ts : undefined) ?? message.ts
        const recentMessages = await this.fetchRecentMessages(client, message.channel, threadTs)

        const event: AgentEvent = {
          id: crypto.randomUUID(),
          trigger: { type: 'slack', channelId: message.channel, threadTs, userId: message.user!, recentMessages },
          agentId: agent.id,
          message: 'text' in message ? message.text ?? '' : '',
          timestamp: new Date().toISOString(),
        }

        await this.handleEventUseCase.execute(event)
      })

      app.event('app_mention', async ({ event: mentionEvent, client }) => {
        const threadTs = mentionEvent.thread_ts ?? mentionEvent.ts
        const recentMessages = await this.fetchRecentMessages(client, mentionEvent.channel, threadTs)

        const event: AgentEvent = {
          id: crypto.randomUUID(),
          trigger: { type: 'slack', channelId: mentionEvent.channel, threadTs, userId: mentionEvent.user!, recentMessages },
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

  private async fetchRecentMessages(client: WebClient, channelId: string, threadTs?: string): Promise<SlackMessage[]> {
    const result = threadTs
      ? await client.conversations.replies({ channel: channelId, ts: threadTs, limit: 6 })
      : await client.conversations.history({ channel: channelId, limit: 6 })

    const all = result.messages ?? []

    // replies: chronological (oldest first), drop the last (current message)
    // history: reverse chronological (newest first), drop the first (current message), then reverse
    const prior = threadTs
      ? all.slice(0, -1).slice(-5)
      : all.slice(1, 6).reverse()

    return prior.map((m) => ({ user: m.user ?? 'unknown', text: m.text ?? '' }))
  }

  async stop(): Promise<void> {
    for (const [id, app] of this.apps) {
      await app.stop()
      console.log(`Slack bot stopped: ${id}`)
    }
    this.apps.clear()
  }
}
