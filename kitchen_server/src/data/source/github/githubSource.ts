import { ProjectItemContentModel } from '../../model/projectItemModel.js';
import { IssueProjectItemModel } from '../../model/issueProjectItemModel.js';

export interface GithubSource {
    resolveNodeContent(contentNodeId: string): Promise<ProjectItemContentModel | null>;
    getProjectItemStatus(itemNodeId: string): Promise<string | null>;
    resolveIssueProjectItem(owner: string, repo: string, issueNumber: number): Promise<IssueProjectItemModel | null>;
    resolvePrLinkedIssues(owner: string, repo: string, prNumber: number): Promise<IssueProjectItemModel[]>;
}
