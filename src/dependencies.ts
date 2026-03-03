import { ConfigRepository } from './data/repository/config.repository.ts'
import { ClaudeSource } from './data/source/claude.source.ts'
import { AgentRepository } from './data/repository/agent.repository.ts'
import { EventRepository } from './data/repository/event.repository.ts'
import { HandleEventUseCase } from './domain/usecase/handle-event.use-case.ts'
import { HealthRoutes } from './presentation/routes/health.routes.ts'
import { AgentRoutes } from './presentation/routes/agent.routes.ts'
import { DashboardRoutes } from './presentation/routes/dashboard.routes.ts'
import { Server } from './presentation/server.ts'

// Sources
export const claudeSource = new ClaudeSource()

// Repositories
export const configRepository = new ConfigRepository()
export const agentRepository = new AgentRepository(configRepository)
export const eventRepository = new EventRepository(configRepository, agentRepository, claudeSource)

// Use cases
export const handleEventUseCase = new HandleEventUseCase(agentRepository, eventRepository)

// Presentation
export const healthRoutes = new HealthRoutes()
export const agentRoutes = new AgentRoutes(handleEventUseCase)
export const dashboardRoutes = new DashboardRoutes(eventRepository)
export const server = new Server(healthRoutes, agentRoutes, dashboardRoutes)
