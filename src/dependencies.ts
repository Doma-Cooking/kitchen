import { ConfigRepository } from './data/repository/config.repository.ts'
import { ClaudeSource } from './data/source/claude.source.ts'
import { WorkspaceSource } from './data/source/workspace.source.ts'
import { PostgresSource } from './data/source/postgres.source.ts'
import { AgentRepository } from './data/repository/agent.repository.ts'
import { EventRepository } from './data/repository/event.repository.ts'
import { StationRepository } from './data/repository/station.repository.ts'
import { HandleEventUseCase } from './domain/usecase/handle-event.use-case.ts'
import { HealthRoutes } from './presentation/routes/health.routes.ts'
import { AgentRoutes } from './presentation/routes/agent.routes.ts'
import { DashboardRoutes } from './presentation/routes/dashboard.routes.ts'
import { SlackRoutes } from './presentation/routes/slack.routes.ts'
import { Server } from './presentation/server.ts'

// Repositories
export const configRepository = new ConfigRepository()

// Sources
export const claudeSource = new ClaudeSource()
export const postgresSource = new PostgresSource(configRepository)
export const workspaceSource = new WorkspaceSource(configRepository)
export const agentRepository = new AgentRepository(configRepository)
export const stationRepository = new StationRepository(postgresSource.pool)
export const eventRepository = new EventRepository(configRepository, agentRepository, claudeSource, stationRepository, workspaceSource)

// Use cases
export const handleEventUseCase = new HandleEventUseCase(agentRepository, eventRepository)

// Presentation
export const healthRoutes = new HealthRoutes()
export const agentRoutes = new AgentRoutes(handleEventUseCase)
export const dashboardRoutes = new DashboardRoutes(eventRepository)
export const slackRoutes = new SlackRoutes(agentRepository, handleEventUseCase)
export const server = new Server(healthRoutes, agentRoutes, dashboardRoutes)

// Init

await postgresSource.init()
