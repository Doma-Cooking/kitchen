import type { SchedulerRepository } from '../../data/repository/scheduler.repository.js'

export class SchedulerRoutes {
  constructor(private readonly schedulerRepository: SchedulerRepository) {}

  start(): void {
    this.schedulerRepository.start()
  }

  stop(): void {
    this.schedulerRepository.stop()
  }
}
