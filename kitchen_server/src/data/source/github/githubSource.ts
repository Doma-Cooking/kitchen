import { ProjectItemContentModel } from '../../model/projectItemModel.js';

export interface GithubSource {
    resolveNodeContent(contentNodeId: string): Promise<ProjectItemContentModel | null>;
    getProjectItemStatus(itemNodeId: string): Promise<string | null>;
}
