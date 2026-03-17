import { Cron } from 'croner'

export class CronSource {
  private readonly jobs: Cron[] = []

  schedule(name: string, expression: string, fn: () => void | Promise<void>): void {
    const job = new Cron(expression, { catch: true }, fn)
    this.jobs.push(job)
  }

  stop(): void {
    for (const job of this.jobs) {
      job.stop()
    }
    this.jobs.length = 0
  }
}
