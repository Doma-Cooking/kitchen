import { createAppAuth } from '@octokit/auth-app';
import { graphql } from '@octokit/graphql';
import { GithubSource } from './githubSource.js';
import { ProjectItemContentModel } from '../../model/projectItemModel.js';

interface IssueNode {
    __typename: string;
    number: number;
    title: string;
    labels: { nodes: { name: string }[] };
    repository: { nameWithOwner: string };
}

interface ProjectV2ItemNode {
    __typename: string;
    fieldValueByName: {
        __typename: string;
        name: string;
    } | null;
}

export class GraphqlGithubSource implements GithubSource {
    private graphqlWithAuth: typeof graphql;

    constructor(appId: string, privateKey: string, installationId: string) {
        const auth = createAppAuth({ appId, privateKey, installationId: Number(installationId) });
        this.graphqlWithAuth = graphql.defaults({
            request: {
                hook: auth.hook.bind(auth),
            },
        });
    }

    async resolveNodeContent(contentNodeId: string): Promise<ProjectItemContentModel | null> {
        const { node } = await this.graphqlWithAuth<{ node: IssueNode | null }>(
            `query($id: ID!) {
                node(id: $id) {
                    ... on Issue {
                        __typename
                        number
                        title
                        labels(first: 50) { nodes { name } }
                        repository { nameWithOwner }
                    }
                }
            }`,
            { id: contentNodeId }
        );

        if (node?.__typename !== 'Issue') return null;

        return {
            number: node.number,
            title: node.title,
            repo: node.repository.nameWithOwner,
            labels: node.labels.nodes.map((l: { name: string }) => l.name),
        };
    }

    async getProjectItemStatus(itemNodeId: string): Promise<string | null> {
        const { node } = await this.graphqlWithAuth<{ node: ProjectV2ItemNode | null }>(
            `query($id: ID!) {
                node(id: $id) {
                    ... on ProjectV2Item {
                        __typename
                        fieldValueByName(name: "Status") {
                            ... on ProjectV2ItemFieldSingleSelectValue {
                                __typename
                                name
                            }
                        }
                    }
                }
            }`,
            { id: itemNodeId }
        );

        if (node?.__typename !== 'ProjectV2Item') return null;
        if (node.fieldValueByName?.__typename !== 'ProjectV2ItemFieldSingleSelectValue') return null;

        return node.fieldValueByName.name;
    }
}
