import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { HonoAdapter } from '@bull-board/hono'
import { serveStatic } from '@hono/node-server/serve-static'
import type { EventRepository } from '../../data/repository/event.repository.js'

export const DASHBOARD_RELATIVE_PATH = '/queues'

export class DashboardRoutes {
  readonly serverAdapter: HonoAdapter

  constructor(eventRepository: EventRepository) {
    this.serverAdapter = new HonoAdapter(serveStatic)

    createBullBoard({
      queues: [new BullMQAdapter(eventRepository.getQueue())],
      serverAdapter: this.serverAdapter,
    })
  }
}
