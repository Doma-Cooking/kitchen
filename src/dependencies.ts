import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { ConfigRepository } from './data/repository/config.repository.js'
import { ClaudeSource } from './data/source/claude.source.js'
import { WorkspaceSource } from './data/source/workspace.source.js'
import { PostgresSource } from './data/source/postgres.source.js'
import { AgentRepository } from './data/repository/agent.repository.js'
import { EventRepository } from './data/repository/event.repository.js'
import { StationRepository } from './data/repository/station.repository.js'
import { HandleEventUseCase } from './domain/usecase/handle-event.use-case.js'
import { HealthRoutes } from './presentation/routes/health.routes.js'
import { AgentRoutes } from './presentation/routes/agent.routes.js'
import { DashboardRoutes } from './presentation/routes/dashboard.routes.js'
import { SlackRoutes } from './presentation/routes/slack.routes.js'
import { SchedulerRoutes } from './presentation/routes/scheduler.routes.js'
import { Server } from './presentation/server.js'

function preInit(): void {
  const raw = readFileSync('.kitchen.yaml', 'utf8')
  const yaml = parse(raw) as { plugins: { path: string; git?: { url: string; branch?: string } } }
  if (yaml.plugins.git) {
    const { path: pluginsPath, git } = yaml.plugins
    const branch = git.branch ?? 'main'
    const credentialHelperPath = fileURLToPath(new URL('./scripts/git-credential-github-app.js', import.meta.url))
    const env = {
      ...process.env,
      GIT_CONFIG_COUNT: '1',
      GIT_CONFIG_KEY_0: 'credential.helper',
      GIT_CONFIG_VALUE_0: `!node ${credentialHelperPath}`,
    }
    const gitDir = join(pluginsPath, '.git')
    if (existsSync(gitDir)) {
      console.log(`Pulling plugin repo at ${pluginsPath}`)
      execSync(`git -C "${pluginsPath}" pull --ff-only origin "${branch}"`, { stdio: 'inherit', env })
    } else {
      console.log(`Cloning plugin repo from ${git.url} into ${pluginsPath}`)
      execSync(`git clone --branch "${branch}" --depth 1 "${git.url}" "${pluginsPath}"`, { stdio: 'inherit', env })
    }
  }
}

async function postInit(): Promise<void> {
  await postgresSource.init()
}

preInit()

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
export const schedulerRoutes = new SchedulerRoutes(agentRepository, handleEventUseCase)
export const server = new Server(healthRoutes, agentRoutes, dashboardRoutes)

// Init

await postInit()
