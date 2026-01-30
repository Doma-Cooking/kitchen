import { createAppAuth } from '@octokit/auth-app';
import { graphql } from '@octokit/graphql';
import { GithubSource } from './githubSource.js';
import { ProjectItemContentModel } from '../../model/projectItemModel.js';
import { IssueProjectItemModel } from '../../model/issueProjectItemModel.js';

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

interface StatusFieldValue {
    __typename: string;
    name: string;
}

interface ProjectItemNode {
    fieldValueByName: StatusFieldValue | null;
}

interface IssueWithProjectsNode {
    number: number;
    title: string;
    labels: { nodes: { name: string }[] };
    repository: { nameWithOwner: string };
    projectItems: { nodes: ProjectItemNode[] };
}

const issueWithProjectsFragment = `
    number
    title
    labels(first: 50) { nodes { name } }
    repository { nameWithOwner }
    projectItems(first: 10) {
        nodes {
            fieldValueByName(name: "Status") {
                ... on ProjectV2ItemFieldSingleSelectValue {
                    __typename
                    name
                }
            }
        }
    }
`;

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

    async resolveIssueProjectItem(owner: string, repo: string, issueNumber: number): Promise<IssueProjectItemModel | null> {
        const { repository } = await this.graphqlWithAuth<{ repository: { issue: IssueWithProjectsNode | null } | null }>(
            `query($owner: String!, $repo: String!, $issueNumber: Int!) {
                repository(owner: $owner, name: $repo) {
                    issue(number: $issueNumber) {
                        ${issueWithProjectsFragment}
                    }
                }
            }`,
            { owner, repo, issueNumber }
        );

        const issue = repository?.issue;
        if (!issue) return null;

        return this.mapIssueWithProjects(issue);
    }

    async resolvePrLinkedIssues(owner: string, repo: string, prNumber: number): Promise<IssueProjectItemModel[]> {
        const { repository } = await this.graphqlWithAuth<{ repository: { pullRequest: { closingIssuesReferences: { nodes: IssueWithProjectsNode[] } } | null } | null }>(
            `query($owner: String!, $repo: String!, $prNumber: Int!) {
                repository(owner: $owner, name: $repo) {
                    pullRequest(number: $prNumber) {
                        closingIssuesReferences(first: 10) {
                            nodes {
                                ${issueWithProjectsFragment}
                            }
                        }
                    }
                }
            }`,
            { owner, repo, prNumber }
        );

        const nodes = repository?.pullRequest?.closingIssuesReferences.nodes;
        if (!nodes) return [];

        return nodes.map(node => this.mapIssueWithProjects(node));
    }

    private mapIssueWithProjects(node: IssueWithProjectsNode): IssueProjectItemModel {
        return {
            number: node.number,
            title: node.title,
            repo: node.repository.nameWithOwner,
            labels: node.labels.nodes.map((l: { name: string }) => l.name),
            columns: node.projectItems.nodes
                .map(item => item.fieldValueByName)
                .filter((fv): fv is StatusFieldValue => fv?.__typename === 'ProjectV2ItemFieldSingleSelectValue')
                .map(fv => fv.name),
        };
    }
}
