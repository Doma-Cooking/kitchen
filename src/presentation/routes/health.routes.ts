import { Hono } from 'hono'

export class HealthRoutes {
  readonly router: Hono

  constructor() {
    this.router = new Hono()

    this.router.get('/health', (c) => {
      return c.json({ status: 'ok', timestamp: new Date().toISOString() })
    })
  }
}
