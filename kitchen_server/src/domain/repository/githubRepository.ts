import { GithubSource } from '../../data/source/github/githubSource.js';
import { ProjectItemEntity } from '../entity/projectItemEntity.js';

export interface GithubRepository {
    resolveProjectItem(contentNodeId: string, itemNodeId: string): Promise<ProjectItemEntity | null>;
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
        };
    }
}
