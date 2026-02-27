import { GithubRepository } from '../../../repository/githubRepository.js';
import { ProjectItemEntity } from '../../../entity/projectItemEntity.js';
import { IssueProjectItemModel } from '../../../../data/model/issueProjectItemModel.js';

export interface ResolveImplementingIssueUseCase {
  fromPr(owner: string, repo: string, prNumber: number): Promise<ProjectItemEntity | null>;
  fromIssue(owner: string, repo: string, issueNumber: number): Promise<ProjectItemEntity | null>;
}

export class ResolveImplementingIssueUseCaseImpl implements ResolveImplementingIssueUseCase {
  private githubRepository: GithubRepository;
  private labelEnabled: string;
  private columnImplementing: string;

  constructor(githubRepository: GithubRepository, labelEnabled: string, columnImplementing: string) {
    this.githubRepository = githubRepository;
    this.labelEnabled = labelEnabled;
    this.columnImplementing = columnImplementing;
  }

  async fromPr(owner: string, repo: string, prNumber: number): Promise<ProjectItemEntity | null> {
    const issues = await this.githubRepository.resolvePrLinkedIssues(owner, repo, prNumber);
    const match = issues.find(issue => this.isValidImplementingIssue(issue));
    if (!match) return null;

    return {
      number: match.number,
      title: match.title,
      repo: match.repo,
      labels: match.labels,
      column: this.columnImplementing,
    };
  }

  async fromIssue(owner: string, repo: string, issueNumber: number): Promise<ProjectItemEntity | null> {
    const issue = await this.githubRepository.resolveIssueProjectItem(owner, repo, issueNumber);
    if (!issue || !this.isValidImplementingIssue(issue)) return null;

    return {
      number: issue.number,
      title: issue.title,
      repo: issue.repo,
      labels: issue.labels,
      column: this.columnImplementing,
    };
  }

  private isValidImplementingIssue(issue: IssueProjectItemModel): boolean {
    return issue.labels.includes(this.labelEnabled) && issue.columns.includes(this.columnImplementing);
  }
}
