import { Hono } from 'hono'
import { basicAuth } from 'hono/basic-auth'
import type { KitchenConfig } from '../domain/entity/kitchen-config.js'
import type { HealthRoutes } from './routes/health.routes.js'
import type { AgentRoutes } from './routes/agent.routes.js'
import { DASHBOARD_RELATIVE_PATH, type DashboardRoutes } from './routes/dashboard.routes.js'
import { METRICS_RELATIVE_PATH, type MetricsRoutes } from './routes/metrics.routes.js'

export const ADMIN_BASE_PATH = '/admin'

export class Server {
  constructor(
    private readonly healthRoutes: HealthRoutes,
    private readonly agentRoutes: AgentRoutes,
    private readonly dashboardRoutes: DashboardRoutes,
    private readonly metricsRoutes: MetricsRoutes,
  ) {}

  createApp(config: KitchenConfig): Hono {
    const app = new Hono()

    app.route('/', this.healthRoutes.router)
    app.route('/', this.agentRoutes.router)

    if (config.adminUsername && config.adminPassword) {
      app.use(`${ADMIN_BASE_PATH}/*`, basicAuth({ username: config.adminUsername, password: config.adminPassword }))
    }

    const dashboardPath = `${ADMIN_BASE_PATH}${DASHBOARD_RELATIVE_PATH}`
    this.dashboardRoutes.serverAdapter.setBasePath(dashboardPath)
    app.route(dashboardPath, this.dashboardRoutes.serverAdapter.registerPlugin())
    app.route(`${ADMIN_BASE_PATH}${METRICS_RELATIVE_PATH}`, this.metricsRoutes.router)

    return app
  }
}
