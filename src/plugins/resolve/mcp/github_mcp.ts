import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createAppAuth } from '@octokit/auth-app';
import { graphql } from '@octokit/graphql';

const appId = process.env.GITHUB_APP_ID;
const privateKey = process.env.GITHUB_PRIVATE_KEY;
const installationId = process.env.GITHUB_INSTALLATION_ID;

if (!appId || !privateKey || !installationId) {
  console.error('GITHUB_APP_ID, GITHUB_PRIVATE_KEY, and GITHUB_INSTALLATION_ID are required');
  process.exit(1);
}

const auth = createAppAuth({
  appId,
  privateKey,
  installationId,
});

async function getGraphqlClient() {
  const { token } = await auth({ type: 'installation' });
  return graphql.defaults({
    headers: { authorization: `token ${token}` },
  });
}

const server = new McpServer({
  name: 'resolve-github',
  version: '1.0.0',
});

server.registerTool(
  'github_read_issue',
  {
    description: 'Read a GitHub issue body and comments',
    inputSchema: {
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      issue_number: z.number().describe('Issue number'),
    },
  },
  async ({ owner, repo, issue_number }) => {
    const gql = await getGraphqlClient();
    const result = await gql<{
      repository: {
        issue: {
          title: string;
          body: string;
          labels: { nodes: { name: string }[] };
          comments: { nodes: { author: { login: string }; body: string }[] };
        };
      };
    }>(
      `query($owner: String!, $repo: String!, $number: Int!) {
        repository(owner: $owner, name: $repo) {
          issue(number: $number) {
            title
            body
            labels(first: 20) { nodes { name } }
            comments(first: 50) { nodes { author { login } body } }
          }
        }
      }`,
      { owner, repo, number: issue_number }
    );
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.repository.issue, null, 2) }] };
  }
);

server.registerTool(
  'github_read_pr',
  {
    description: 'Read a GitHub pull request details',
    inputSchema: {
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      pr_number: z.number().describe('Pull request number'),
    },
  },
  async ({ owner, repo, pr_number }) => {
    const gql = await getGraphqlClient();
    const result = await gql<{
      repository: {
        pullRequest: {
          title: string;
          body: string;
          headRefName: string;
          baseRefName: string;
          comments: { nodes: { author: { login: string }; body: string }[] };
          reviews: { nodes: { author: { login: string }; body: string; state: string }[] };
        };
      };
    }>(
      `query($owner: String!, $repo: String!, $number: Int!) {
        repository(owner: $owner, name: $repo) {
          pullRequest(number: $number) {
            title
            body
            headRefName
            baseRefName
            comments(first: 50) { nodes { author { login } body } }
            reviews(first: 20) { nodes { author { login } body state } }
          }
        }
      }`,
      { owner, repo, number: pr_number }
    );
    return { content: [{ type: 'text' as const, text: JSON.stringify(result.repository.pullRequest, null, 2) }] };
  }
);

server.registerTool(
  'github_post_comment',
  {
    description: 'Post a comment on a GitHub issue or pull request (for clarification)',
    inputSchema: {
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      issue_number: z.number().describe('Issue or PR number'),
      body: z.string().describe('Comment body'),
    },
  },
  async ({ owner, repo, issue_number, body }) => {
    const gql = await getGraphqlClient();

    const idResult = await gql<{ repository: { issueOrPullRequest: { id: string } } }>(
      `query($owner: String!, $repo: String!, $number: Int!) {
        repository(owner: $owner, name: $repo) {
          issueOrPullRequest(number: $number) { ... on Issue { id } ... on PullRequest { id } }
        }
      }`,
      { owner, repo, number: issue_number }
    );

    const subjectId = idResult.repository.issueOrPullRequest.id;
    await gql(
      `mutation($subjectId: ID!, $body: String!) {
        addComment(input: { subjectId: $subjectId, body: $body }) {
          commentEdge { node { id } }
        }
      }`,
      { subjectId, body }
    );

    return { content: [{ type: 'text' as const, text: JSON.stringify({ ok: true }) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
