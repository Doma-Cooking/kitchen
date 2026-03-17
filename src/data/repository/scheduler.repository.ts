import type { CronSource } from '../source/cron.source.js'

export class SchedulerRepository {
  constructor(private readonly cronSource: CronSource) {}

  register(name: string, expression: string, fn: () => Promise<void>): void {
    this.cronSource.schedule(name, expression, fn)
    console.log(`Job registered: "${name}" @ ${expression}`)
  }

  stop(): void {
    this.cronSource.stop()
    console.log('Scheduled jobs stopped')
  }
}
