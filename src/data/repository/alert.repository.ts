import type { SlackSource } from '../source/slack.source.js'
import type { AlertConfig, AlertResult } from '../../domain/entity/alert-config.js'

export class AlertRepository {
  private readonly activeAlerts = new Set<string>()

  constructor(private readonly slackSource: SlackSource) {}

  async processResults(results: AlertResult[], config: AlertConfig): Promise<void> {
    for (const result of results) {
      const key = `${result.agentId}/${result.taskType}`
      const wasActive = this.activeAlerts.has(key)

      if (result.isDegraded && !wasActive) {
        this.activeAlerts.add(key)
        await this.slackSource.postMessage(config.channel, this.formatAlert(result, config))
      } else if (!result.isDegraded && wasActive) {
        this.activeAlerts.delete(key)
        await this.slackSource.postMessage(config.channel, this.formatRecovery(result))
      }
    }
  }

  private formatAlert(result: AlertResult, config: AlertConfig): string {
    const rate = Math.round(result.successRate * 100)
    const threshold = Math.round(result.threshold * 100)
    return [
      '🚨 *Task degradation detected*',
      `Agent: ${result.agentId} | Task type: ${result.taskType}`,
      `Success rate: ${rate}% (threshold: ${threshold}%) over the last ${config.windowHours}h`,
      `Jobs evaluated: ${result.jobCount}`,
    ].join('\n')
  }

  private formatRecovery(result: AlertResult): string {
    const rate = Math.round(result.successRate * 100)
    const threshold = Math.round(result.threshold * 100)
    return [
      '✅ *Task degradation resolved*',
      `Agent: ${result.agentId} | Task type: ${result.taskType}`,
      `Success rate: ${rate}% — back above threshold (${threshold}%)`,
    ].join('\n')
  }
}
