import { ConfigRepository } from './data/repository/config.repository.js'
import { ClaudeSource } from './data/source/claude.source.js'
import { WorkspaceSource } from './data/source/workspace.source.js'
import { PostgresSource } from './data/source/postgres.source.js'
import { AgentRepository } from './data/repository/agent.repository.js'
import { EventRepository } from './data/repository/event.repository.js'
import { StationRepository } from './data/repository/station.repository.js'
import { LogRepository } from './data/repository/log.repository.js'
import { HandleEventUseCase } from './domain/usecase/handle-event.use-case.js'
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
export const agentRepository = new AgentRepository(configRepository)
export const stationRepository = new StationRepository(postgresSource.pool)
export const logRepository = new LogRepository(postgresSource.pool)
export const eventRepository = new EventRepository(configRepository, agentRepository, claudeSource, stationRepository, workspaceSource, logRepository)

// Use cases
export const handleEventUseCase = new HandleEventUseCase(agentRepository, eventRepository)

// Presentation
export const healthRoutes = new HealthRoutes()
export const agentRoutes = new AgentRoutes(handleEventUseCase)
export const dashboardRoutes = new DashboardRoutes(eventRepository)
export const metricsRoutes = new MetricsRoutes(logRepository)
export const slackRoutes = new SlackRoutes(agentRepository, handleEventUseCase)
export const schedulerRoutes = new SchedulerRoutes(agentRepository, handleEventUseCase)
export const server = new Server(healthRoutes, agentRoutes, dashboardRoutes, metricsRoutes)

// Init

await postgresSource.init()
