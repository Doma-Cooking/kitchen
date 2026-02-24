import { GithubRepository } from '../../../repository/githubRepository.js';
import { ProjectItemEntity } from '../../../entity/projectItemEntity.js';

export interface ResolveProjectItemUseCase {
  execute(contentNodeId: string, itemNodeId: string): Promise<ProjectItemEntity | null>;
}

export class ResolveProjectItemUseCaseImpl implements ResolveProjectItemUseCase {
  private githubRepository: GithubRepository;
  private labelEnabled: string;

  constructor(githubRepository: GithubRepository, labelEnabled: string) {
    this.githubRepository = githubRepository;
    this.labelEnabled = labelEnabled;
  }

  async execute(contentNodeId: string, itemNodeId: string): Promise<ProjectItemEntity | null> {
    const item = await this.githubRepository.resolveProjectItem(contentNodeId, itemNodeId);
    if (!item) return null;

    if (!item.labels.includes(this.labelEnabled)) return null;

    return item;
  }
}
