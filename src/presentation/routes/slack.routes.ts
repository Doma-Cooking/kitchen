import { Hono } from 'hono'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { WebClient } from '@slack/web-api'
import type { AgentEvent } from '../../domain/entity/agent-event.js'
import type { SlackAttachment, SlackMessage } from '../../domain/entity/event-trigger.js'
import type { AgentRepository } from '../../data/repository/agent.repository.js'
import type { HandleEventUseCase } from '../../domain/usecase/handle-event.use-case.js'

export class SlackRoutes {
  readonly router = new Hono()

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly handleEventUseCase: HandleEventUseCase,
  ) {
    this.router.post('/events/:agentId', async (c) => {
      const agentId = c.req.param('agentId')
      const agent = this.agentRepository.getAgentConfig(agentId)

      if (!agent?.slack) {
        return c.json({ error: 'not found' }, 404)
      }

      const rawBody = await c.req.text()

      if (!this.verifySignature(c.req.header('x-slack-request-timestamp') ?? '', rawBody, c.req.header('x-slack-signature') ?? '', agent.slack.signingSecret)) {
        return c.json({ error: 'invalid signature' }, 403)
      }

      const body = JSON.parse(rawBody)

      // Handle Slack URL verification challenge
      if (body.type === 'url_verification') {
        return c.json({ challenge: body.challenge })
      }

      if (body.type !== 'event_callback') {
        return c.json({ ok: true })
      }

      const slackEvent = body.event
      const client = new WebClient(agent.slack.botToken)

      const isMessage = slackEvent.type === 'message' && !slackEvent.bot_id && (!slackEvent.subtype || slackEvent.subtype === 'file_share')

      if (isMessage) {
        const threadTs = slackEvent.thread_ts as string | undefined
        const recentMessages = await this.fetchRecentMessages(client, slackEvent.channel, threadTs)
        const attachments = await this.fetchAttachments(client, slackEvent.files ?? [])

        const effectiveThreadTs = threadTs ?? slackEvent.ts
        const stationId = `${agent.id}:slack:${slackEvent.channel}:${effectiveThreadTs}`

        const event: AgentEvent = {
          id: crypto.randomUUID(),
          trigger: { type: 'slack', channelId: slackEvent.channel, threadTs, messageTs: slackEvent.ts, userId: slackEvent.user, recentMessages, attachments },
          agentId: agent.id,
          stationId,
          message: slackEvent.text ?? '',
          timestamp: new Date().toISOString(),
        }

        await this.handleEventUseCase.execute(event)
      } else if (slackEvent.type === 'app_mention') {
        const threadTs = (slackEvent.thread_ts ?? slackEvent.ts) as string
        const recentMessages = await this.fetchRecentMessages(client, slackEvent.channel, threadTs)
        const stationId = `${agent.id}:slack:${slackEvent.channel}:${threadTs}`

        const event: AgentEvent = {
          id: crypto.randomUUID(),
          trigger: { type: 'slack', channelId: slackEvent.channel, threadTs, messageTs: slackEvent.ts, userId: slackEvent.user, recentMessages },
          agentId: agent.id,
          stationId,
          message: slackEvent.text ?? '',
          timestamp: new Date().toISOString(),
        }

        await this.handleEventUseCase.execute(event)
      }

      return c.json({ ok: true })
    })
  }

  private verifySignature(timestamp: string, rawBody: string, signature: string, signingSecret: string): boolean {
    if (!timestamp || !signature) return false

    // Reject requests older than 5 minutes to prevent replay attacks
    const now = Math.floor(Date.now() / 1000)
    if (Math.abs(now - Number(timestamp)) > 300) return false

    const basestring = `v0:${timestamp}:${rawBody}`
    const expected = `v0=${createHmac('sha256', signingSecret).update(basestring).digest('hex')}`

    if (expected.length !== signature.length) return false
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  }

  private async fetchAttachments(client: WebClient, files: Array<{ id?: string }>): Promise<SlackAttachment[]> {
    if (!files.length) return []

    const attachments: SlackAttachment[] = []

    for (const file of files) {
      if (!file.id) continue
      try {
        const info = await client.files.info({ file: file.id })
        if (info.file) {
          attachments.push({
            id: info.file.id ?? file.id,
            name: info.file.name ?? 'unknown',
            mimetype: info.file.mimetype ?? 'application/octet-stream',
            url: info.file.url_private_download ?? info.file.url_private ?? '',
          })
        }
      } catch {
        // Skip files we can't fetch info for
      }
    }

    return attachments
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

    return prior.map((m) => ({ user: m.user ?? 'unknown', text: m.text ?? '', ts: m.ts }))
  }
}
