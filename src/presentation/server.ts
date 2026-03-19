import { Hono } from 'hono'
import { basicAuth } from 'hono/basic-auth'
import type { KitchenConfig } from '../domain/entity/kitchen-config.js'
import type { HealthRoutes } from './routes/health.routes.js'
import type { AgentRoutes } from './routes/agent.routes.js'
import type { DashboardRoutes } from './routes/dashboard.routes.js'
import type { MetricsRoutes } from './routes/metrics.routes.js'
import type { SlackRoutes } from './routes/slack.routes.js'
import { injectAdminHeader } from './routes/header.routes.js'
import { ADMIN_PATH, DASHBOARD_PATH } from './routes/routes.js'

export class Server {
  constructor(
    private readonly healthRoutes: HealthRoutes,
    private readonly agentRoutes: AgentRoutes,
    private readonly dashboardRoutes: DashboardRoutes,
    private readonly metricsRoutes: MetricsRoutes,
    private readonly slackRoutes: SlackRoutes,
  ) {}

  createApp(config: KitchenConfig): Hono {
    const app = new Hono()

    app.get('/', (c) => c.redirect(DASHBOARD_PATH))
    app.route('/', this.healthRoutes.router)
    app.route('/', this.agentRoutes.router)
    app.route('/slack', this.slackRoutes.router)

    if (config.adminUsername && config.adminPassword) {
      app.use(`${ADMIN_PATH}/*`, basicAuth({ username: config.adminUsername, password: config.adminPassword }))
    }

    // Register our API routes first so they take precedence over Bull Board
    app.route('/', this.metricsRoutes.router)

    // Inject shared header into Bull Board HTML responses
    app.use(`${DASHBOARD_PATH}*`, injectAdminHeader)

    // Bull Board served directly at /admin/queues — refresh preserves sub-route
    app.route(DASHBOARD_PATH, this.dashboardRoutes.serverAdapter.registerPlugin())

    return app
  }
}
