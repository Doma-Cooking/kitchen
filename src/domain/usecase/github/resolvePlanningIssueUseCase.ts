import { GithubRepository } from '../../repository/githubRepository.js';
import { ProjectItemEntity } from '../../entity/projectItemEntity.js';
import { IssueProjectItemModel } from '../../../data/model/issueProjectItemModel.js';

export interface ResolvePlanningIssueUseCase {
    fromPr(owner: string, repo: string, prNumber: number): Promise<ProjectItemEntity | null>;
    fromIssue(owner: string, repo: string, issueNumber: number): Promise<ProjectItemEntity | null>;
}

export class ResolvePlanningIssueUseCaseImpl implements ResolvePlanningIssueUseCase {
    private githubRepository: GithubRepository;
    private labelEnabled: string;
    private columnPlanning: string;

    constructor(githubRepository: GithubRepository, labelEnabled: string, columnPlanning: string) {
        this.githubRepository = githubRepository;
        this.labelEnabled = labelEnabled;
        this.columnPlanning = columnPlanning;
    }

    async fromPr(owner: string, repo: string, prNumber: number): Promise<ProjectItemEntity | null> {
        const issues = await this.githubRepository.resolvePrLinkedIssues(owner, repo, prNumber);
        const match = issues.find(issue => this.isValidPlanningIssue(issue));
        if (!match) return null;

        return {
            number: match.number,
            title: match.title,
            repo: match.repo,
            labels: match.labels,
            column: this.columnPlanning,
        };
    }

    async fromIssue(owner: string, repo: string, issueNumber: number): Promise<ProjectItemEntity | null> {
        const issue = await this.githubRepository.resolveIssueProjectItem(owner, repo, issueNumber);
        if (!issue || !this.isValidPlanningIssue(issue)) return null;

        return {
            number: issue.number,
            title: issue.title,
            repo: issue.repo,
            labels: issue.labels,
            column: this.columnPlanning,
        };
    }

    private isValidPlanningIssue(issue: IssueProjectItemModel): boolean {
        return issue.labels.includes(this.labelEnabled) && issue.columns.includes(this.columnPlanning);
    }
}
