import { GithubSource } from '../../data/source/github/githubSource.js';
import { IssueProjectItemModel } from '../../data/model/issueProjectItemModel.js';
import { ProjectItemEntity } from '../entity/projectItemEntity.js';

export interface GithubRepository {
    resolveProjectItem(contentNodeId: string, itemNodeId: string): Promise<ProjectItemEntity | null>;
    resolveIssueProjectItem(owner: string, repo: string, issueNumber: number): Promise<IssueProjectItemModel | null>;
    resolvePrLinkedIssues(owner: string, repo: string, prNumber: number): Promise<IssueProjectItemModel[]>;
}

export class GithubRepositoryImpl implements GithubRepository {
    private source: GithubSource;

    constructor(source: GithubSource) {
        this.source = source;
    }

    async resolveProjectItem(contentNodeId: string, itemNodeId: string): Promise<ProjectItemEntity | null> {
        const [content, status] = await Promise.all([
            this.source.resolveNodeContent(contentNodeId),
            this.source.getProjectItemStatus(itemNodeId),
        ]);

        if (!content || !status) return null;

        return {
            number: content.number,
            title: content.title,
            repo: content.repo,
            labels: content.labels,
            column: status,
            parentNumber: content.parentNumber,
        };
    }

    async resolveIssueProjectItem(owner: string, repo: string, issueNumber: number): Promise<IssueProjectItemModel | null> {
        return this.source.resolveIssueProjectItem(owner, repo, issueNumber);
    }

    async resolvePrLinkedIssues(owner: string, repo: string, prNumber: number): Promise<IssueProjectItemModel[]> {
        return this.source.resolvePrLinkedIssues(owner, repo, prNumber);
    }
}
