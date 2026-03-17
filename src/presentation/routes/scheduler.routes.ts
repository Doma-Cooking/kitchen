import type { AgentEvent } from '../../domain/entity/agent-event.js'
import type { AgentRepository } from '../../data/repository/agent.repository.js'
import type { HandleEventUseCase } from '../../domain/usecase/handle-event.use-case.js'
import type { SchedulerRepository } from '../../data/repository/scheduler.repository.js'
import type { ConfigRepository } from '../../data/repository/config.repository.js'
import type { EvaluateAlertsUseCase } from '../../domain/usecase/evaluate-alerts.use-case.js'

export class SchedulerRoutes {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly handleEventUseCase: HandleEventUseCase,
    private readonly schedulerRepository: SchedulerRepository,
    private readonly configRepository: ConfigRepository,
    private readonly evaluateAlertsUseCase: EvaluateAlertsUseCase,
  ) {}

  start(): void {
    const agents = this.agentRepository.getAllAgents()

    for (const agent of agents) {
      if (!agent.schedules?.length) continue

      for (const schedule of agent.schedules) {
        this.schedulerRepository.register(`${agent.id}/${schedule.name ?? schedule.skill}`, schedule.cron, async () => {
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
      }
    }

    const { alerting } = this.configRepository.getConfig()
    if (alerting) {
      this.schedulerRepository.register('alerting/evaluate', alerting.schedule, async () => {
        const results = await this.evaluateAlertsUseCase.execute(alerting)
        const degraded = results.filter((r) => r.isDegraded)
        if (degraded.length > 0) {
          console.log(`[alerting] ${degraded.length} degraded combination(s):`, degraded)
        } else {
          console.log(`[alerting] all ${results.length} combination(s) healthy`)
        }
      })
    }
  }

}
