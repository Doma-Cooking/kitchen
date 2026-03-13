import { Hono } from 'hono'
import type { HealthRoutes } from './routes/health.routes.js'
import type { AgentRoutes } from './routes/agent.routes.js'
import { DASHBOARD_BASE_PATH, type DashboardRoutes } from './routes/dashboard.routes.js'

export class Server {
  constructor(
    private readonly healthRoutes: HealthRoutes,
    private readonly agentRoutes: AgentRoutes,
    private readonly dashboardRoutes: DashboardRoutes,
  ) {}

  createApp(): Hono {
    const app = new Hono()

    app.route('/', this.healthRoutes.router)
    app.route('/', this.agentRoutes.router)
    app.route(DASHBOARD_BASE_PATH, this.dashboardRoutes.serverAdapter.registerPlugin())

    return app
  }
}
