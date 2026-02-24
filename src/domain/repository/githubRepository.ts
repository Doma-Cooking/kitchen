import { GithubSource } from '../../data/source/github/githubSource.js';
import { IssueProjectItemModel } from '../../data/model/issueProjectItemModel.js';
import { ProjectInfoModel } from '../../data/model/projectItemModel.js';

export interface GithubRepository {
    resolveProjectInfo(projectNodeId: string): Promise<ProjectInfoModel | null>;
    resolveIssueProjectItem(owner: string, repo: string, issueNumber: number): Promise<IssueProjectItemModel | null>;
    resolvePrLinkedIssues(owner: string, repo: string, prNumber: number): Promise<IssueProjectItemModel[]>;
}

export class GithubRepositoryImpl implements GithubRepository {
    private source: GithubSource;

    constructor(source: GithubSource) {
        this.source = source;
    }

    async resolveProjectInfo(projectNodeId: string): Promise<ProjectInfoModel | null> {
        return this.source.resolveProjectInfo(projectNodeId);
    }

    async resolveIssueProjectItem(owner: string, repo: string, issueNumber: number): Promise<IssueProjectItemModel | null> {
        return this.source.resolveIssueProjectItem(owner, repo, issueNumber);
    }

    async resolvePrLinkedIssues(owner: string, repo: string, prNumber: number): Promise<IssueProjectItemModel[]> {
        return this.source.resolvePrLinkedIssues(owner, repo, prNumber);
    }
}
