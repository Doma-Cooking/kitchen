import { ConfigRepository } from './data/repository/config.repository.js'
import { ClaudeSource } from './data/source/claude.source.js'
import { WorkspaceSource } from './data/source/workspace.source.js'
import { PostgresSource } from './data/source/postgres.source.js'
import { CronSource } from './data/source/cron.source.js'
import { SlackSource } from './data/source/slack.source.js'
import { AgentRepository } from './data/repository/agent.repository.js'
import { AlertRepository } from './data/repository/alert.repository.js'
import { EventRepository } from './data/repository/event.repository.js'
import { StationRepository } from './data/repository/station.repository.js'
import { LogRepository } from './data/repository/log.repository.js'
import { SchedulerRepository } from './data/repository/scheduler.repository.js'
import { HandleEventUseCase } from './domain/usecase/handle-event.use-case.js'
import { EvaluateAlertsUseCase } from './domain/usecase/evaluate-alerts.use-case.js'
import { HealthRoutes } from './presentation/routes/health.routes.js'
import { AgentRoutes } from './presentation/routes/agent.routes.js'
import { DashboardRoutes } from './presentation/routes/dashboard.routes.js'
import { MetricsRoutes } from './presentation/routes/metrics.routes.js'
import { SlackRoutes } from './presentation/routes/slack.routes.js'
import { SchedulerRoutes } from './presentation/routes/scheduler.routes.js'
import { Server } from './presentation/server.js'

// Repositories
export const configRepository = new ConfigRepository()

// Sources
export const claudeSource = new ClaudeSource()
export const postgresSource = new PostgresSource(configRepository)
export const workspaceSource = new WorkspaceSource(configRepository)
export const cronSource = new CronSource()
export const slackSource = new SlackSource(configRepository)
export const agentRepository = new AgentRepository(configRepository)
export const alertRepository = new AlertRepository(slackSource)
export const stationRepository = new StationRepository(postgresSource.pool)
export const logRepository = new LogRepository(postgresSource.pool)
export const schedulerRepository = new SchedulerRepository(cronSource)
export const eventRepository = new EventRepository(configRepository, agentRepository, claudeSource, stationRepository, workspaceSource, logRepository)

// Use cases
export const handleEventUseCase = new HandleEventUseCase(agentRepository, eventRepository)
export const evaluateAlertsUseCase = new EvaluateAlertsUseCase(logRepository, alertRepository)

// Presentation
export const healthRoutes = new HealthRoutes()
export const agentRoutes = new AgentRoutes(handleEventUseCase)
export const dashboardRoutes = new DashboardRoutes(eventRepository)
export const metricsRoutes = new MetricsRoutes(logRepository, eventRepository)
export const slackRoutes = new SlackRoutes(agentRepository, handleEventUseCase)
export const schedulerRoutes = new SchedulerRoutes(agentRepository, handleEventUseCase, schedulerRepository, configRepository, evaluateAlertsUseCase)
export const server = new Server(healthRoutes, agentRoutes, dashboardRoutes, metricsRoutes)

// Init

await postgresSource.init()
