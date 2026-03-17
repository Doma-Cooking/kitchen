import type { AlertConfig, AlertResult } from '../entity/alert-config.js'
import type { LogRepository } from '../../data/repository/log.repository.js'

export class EvaluateAlertsUseCase {
  constructor(private readonly logRepository: LogRepository) {}

  async execute(config: AlertConfig): Promise<AlertResult[]> {
    const from = new Date(Date.now() - config.windowHours * 60 * 60 * 1000)
    const metrics = await this.logRepository.getMetrics({ from })

    return metrics
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
  }
}
