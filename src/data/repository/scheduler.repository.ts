import type { CronSource } from '../source/cron.source.js'
import type { AgentRepository } from './agent.repository.js'
import type { HandleEventUseCase } from '../../domain/usecase/handle-event.use-case.js'
import type { AgentEvent } from '../../domain/entity/agent-event.js'

export class SchedulerRepository {
  constructor(
    private readonly cronSource: CronSource,
    private readonly agentRepository: AgentRepository,
    private readonly handleEventUseCase: HandleEventUseCase,
  ) {}

  register(name: string, expression: string, fn: () => Promise<void>): void {
    this.cronSource.schedule(name, expression, fn)
    console.log(`System job registered: "${name}" @ ${expression}`)
  }

  start(): void {
    const agents = this.agentRepository.getAllAgents()

    for (const agent of agents) {
      if (!agent.schedules?.length) continue

      for (const schedule of agent.schedules) {
        this.cronSource.schedule(`${agent.id}/${schedule.name ?? schedule.skill}`, schedule.cron, async () => {
          const event: AgentEvent = {
            id: crypto.randomUUID(),
            trigger: { type: 'cron', cron: schedule.cron, scheduleName: schedule.name },
            agentId: agent.id,
            stationId: schedule.stationId,
            message: `/${schedule.skill}`,
            timestamp: new Date().toISOString(),
          }
          await this.handleEventUseCase.execute(event)
        })

        console.log(`Cron job scheduled: ${agent.id} "${schedule.name ?? schedule.skill}" @ ${schedule.cron}`)
      }
    }
  }

  stop(): void {
    this.cronSource.stop()
    console.log('Cron jobs stopped')
  }
}
