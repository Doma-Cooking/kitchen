import type { QueueConfig } from '../../../di/configuration.js';
import type { CreateCookUseCase } from './createCookUseCase.js';

export interface CreateCooksUseCase {
  execute(queues: QueueConfig[]): Promise<void>;
}

export class CreateCooksUseCaseImpl implements CreateCooksUseCase {
  constructor(private readonly createCookUseCase: CreateCookUseCase) {}

  async execute(queues: QueueConfig[]): Promise<void> {
    const promises = queues.flatMap(q =>
      Array.from({ length: q.workers }, (_, i) =>
        this.createCookUseCase.execute(q.name, `${q.name}-cook-${i}`)
      )
    );
    await Promise.all(promises);
  }
}
