import type { AlertConfig, AlertResult } from '../entity/alert-config.js'
import type { LogRepository } from '../../data/repository/log.repository.js'
import type { AlertRepository } from '../../data/repository/alert.repository.js'

export class EvaluateAlertsUseCase {
  constructor(
    private readonly logRepository: LogRepository,
    private readonly alertRepository: AlertRepository,
  ) {}

  async execute(config: AlertConfig): Promise<void> {
    const from = new Date(Date.now() - config.windowHours * 60 * 60 * 1000)
    const metrics = await this.logRepository.getMetrics({ from })

    const results: AlertResult[] = metrics
      .filter((m) => m.total >= config.minJobs)
      .map((m) => {
        const override = config.overrides?.find(
          (o) => o.agentId === m.agentId && o.taskType === m.taskType,
        )
        const threshold = override?.successRateFloor ?? config.successRateFloor
        const successRate = m.successRate / 100
        return {
          agentId: m.agentId,
          taskType: m.taskType,
          successRate,
          threshold,
          jobCount: m.total,
          isDegraded: successRate < threshold,
        }
      })

    await this.alertRepository.processResults(results, config)
  }
}
