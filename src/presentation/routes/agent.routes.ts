import { Hono } from 'hono'
import type { AgentEvent } from '../../domain/entity/agent-event.js'
import type { HandleEventUseCase } from '../../domain/usecase/handle-event.use-case.js'

export class AgentRoutes {
  readonly router: Hono

  constructor(private readonly handleEventUseCase: HandleEventUseCase) {
    this.router = new Hono()

    this.router.post('/agent/:id/invoke', async (c) => {
      try {
        const agentId = c.req.param('id')
        const body = await c.req.json<{ message: string; stationId?: string }>()

        const event: AgentEvent = {
          id: crypto.randomUUID(),
          trigger: { type: 'api' },
          agentId,
          stationId: body.stationId,
          message: body.message,
          timestamp: new Date().toISOString(),
        }

        const eventId = await this.handleEventUseCase.execute(event)

        return c.json({ eventId, agentId })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return c.json({ error: message }, 400)
      }
    })
  }
}
