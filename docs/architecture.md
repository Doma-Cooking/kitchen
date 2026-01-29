# Kitchen — Architecture Reference

This document contains detailed interface definitions and schemas for Kitchen's core components.

## Provider Interfaces

### Platform Interface

The `IPlatform` interface handles both inbound webhook events and outbound API calls:

```typescript
interface IPlatform {
  // Inbound: parse webhooks into normalized events
  parseWebhook(headers: Headers, payload: unknown): PlatformEvent;
  verifyWebhookSignature(headers: Headers, payload: Buffer, secret: string): boolean;

  // Issues
  getIssue(repo: RepoRef, number: number): Promise<Issue>;
  createIssue(repo: RepoRef, params: CreateIssueParams): Promise<Issue>;
  updateIssue(repo: RepoRef, number: number, params: UpdateIssueParams): Promise<Issue>;

  // Issue relationships
  linkIssues(repo: RepoRef, parent: number, child: number): Promise<void>;
  getLinkedIssues(repo: RepoRef, number: number): Promise<LinkedIssues>;

  // Comments
  createComment(repo: RepoRef, number: number, body: string): Promise<Comment>;
  getComments(repo: RepoRef, number: number, since?: Date): Promise<Comment[]>;

  // Pull Requests
  getPullRequest(repo: RepoRef, number: number): Promise<PullRequest>;
  createPullRequest(repo: RepoRef, params: CreatePRParams): Promise<PullRequest>;
  updatePullRequest(repo: RepoRef, number: number, params: UpdatePRParams): Promise<PullRequest>;
  getPullRequestReviews(repo: RepoRef, number: number): Promise<Review[]>;
  getReviewComments(repo: RepoRef, number: number): Promise<ReviewComment[]>;

  // Labels
  addLabel(repo: RepoRef, number: number, label: string): Promise<void>;
  removeLabel(repo: RepoRef, number: number, label: string): Promise<void>;
}

type PlatformEvent =
  | ColumnMoveEvent
  | IssueCommentEvent
  | PullRequestCommentEvent
  | PullRequestReviewEvent;
```

#### PR Feedback Handling

The implementation agent processes three types of PR feedback:

| Type | Description | How Agent Sees It |
|------|-------------|-------------------|
| PR Comments | General conversation on the PR | Included in context as discussion |
| Review Comments | Inline comments on specific code lines | Includes file path and line number |
| PR Reviews | Formal approve/request changes | Flags `changesRequested` if applicable |

### Session Storage Interface

The `ISessionStorage` interface persists agent session state to S3-compatible storage (MinIO):

```typescript
interface ISessionStorage {
  saveSession(sessionId: string, state: SessionState): Promise<void>;
  loadSession(sessionId: string): Promise<SessionState | null>;
  listSessions(filter?: SessionFilter): Promise<SessionSummary[]>;
  deleteSession(sessionId: string): Promise<void>;
}

interface SessionState {
  id: string;
  repo: RepoRef;
  issueNumber: number;
  phase: 'planning' | 'implementation';
  status: SessionStatus;
  agentState: Buffer;           // Serialized Claude session state
  createdAt: Date;
  updatedAt: Date;
}

type SessionStatus = 'queued' | 'running' | 'waiting_for_user' | 'completed' | 'failed';
```

### Notifier Interface

The `INotifier` interface sends notifications to external channels:

```typescript
interface INotifier {
  notify(event: NotificationEvent): Promise<void>;
}

type NotificationEvent = {
  type: 'agent_started' | 'plan_ready' | 'pr_ready' | 'questions_asked' | 'session_failed';
  repo: RepoRef;
  issueNumber: number;
  sessionId: string;
  message: string;
};
```

### Agent Provider Interface

The `IAgentProvider` interface manages agent container lifecycle:

```typescript
interface IAgentProvider {
  spawn(config: AgentConfig): Promise<void>;
  cancel(sessionId: string): Promise<void>;
}

interface AgentConfig {
  sessionId: string;
  repo: RepoRef;
  issueNumber: number;
  prNumber?: number;
  phase: 'planning' | 'implementation';
  branchName?: string;
  userContext: string;
  storageConfig: string;
}
```

> **Session Resumption:** The container determines fresh start vs resume by checking session storage. If `loadSession(sessionId)` returns existing state, the container loads the conversation history and treats `userContext` as new user input. If no state exists, it's a fresh start. The agent naturally infers whether user input represents answers to questions or revision feedback from the conversation context.

### Git Provider Interface

The `IGitProvider` interface handles branch operations via the platform API:

```typescript
interface IGitProvider {
  createBranch(repo: RepoRef, branchName: string, baseBranch?: string): Promise<void>;
  deleteBranch(repo: RepoRef, branchName: string): Promise<void>;
  getBranch(repo: RepoRef, branchName: string): Promise<Branch | null>;
}
```

> **Note:** Clone, commit, and push are handled inside the agent container via git CLI. The orchestrator only creates/deletes branches via the platform API.

## Agent Output Schema

Agents produce a single structured JSON output enforced via Claude's structured output feature (`response_format`). This ensures the output matches the schema and terminates the agent's turn—no orchestrator logic needed.

```typescript
type AgentOutput = AskQuestions | SubmitPlan | SubmitImplementation;

interface AskQuestions {
  type: 'ask_questions';
  progress?: string;         // Optional progress update
  content: string;           // Full formatted questions markdown
}

interface SubmitPlan {
  type: 'submit_plan';
  progress: string;          // Required progress summary
  content: string;           // Full plan markdown (agent-rendered)
  questions?: string;        // Optional questions posted alongside
  subIssues?: SubIssue[];    // Optional sub-issues to create
}

interface SubIssue {
  title: string;
  labels?: string[];
  body: string;              // Full issue body markdown (agent-rendered)
}

interface SubmitImplementation {
  type: 'submit_implementation';
  progress: string;          // Required progress summary
  content: string;           // Full PR body markdown (agent-rendered)
  questions?: string;        // Optional questions posted alongside
}
```

### Notes
- Agents render content directly as markdown strings. The container posts this content to GitHub.
- When creating sub-issues, the container applies the configured agent label and links them to the parent issue.
- Agents never emit "complete" or "move" actions—they submit work, and users decide next steps.
- Agent containers handle all GitHub API operations (comments, issues, PRs) directly, as well as git operations (clone, commit, push).

## Phase Enforcement

Each phase has specific tool restrictions enforced via the SDK's `allowedTools` configuration:

| Phase | Available Tools |
|-------|-----------------|
| Planning | Read, Glob, Grep, WebFetch, WebSearch + platform read/write tools |
| Implementation | All Claude Code tools + all platform tools |

Planning agents cannot modify files or run commands—they analyze and produce plans. Implementation agents have full access to complete the work.

See [Configuration — Prompts](./configuration.md#prompts) for customization options.

## Agent Tools

Agents access platform functionality via custom tools injected by the orchestrator at spawn time. Tools are divided into read (context gathering) and write (actions) categories.

### Read Tools

| Tool | Parameters | Returns | Phase |
|------|------------|---------|-------|
| `get_issue` | `number` | Issue details | Both |
| `get_comments` | `number`, `since?` | Comment array | Both |
| `get_linked_issues` | `number` | Linked issues | Both |
| `get_pull_request` | `number` | PR details | Implementation |
| `get_reviews` | `number` | Review array | Implementation |
| `get_review_comments` | `number` | Review comment array | Implementation |

### Write Tools

| Tool | Parameters | Returns | Phase |
|------|------------|---------|-------|
| `post_comment` | `number`, `body` | Comment | Both |
| `add_label` | `number`, `label` | void | Both |
| `remove_label` | `number`, `label` | void | Both |
| `create_issue` | `title`, `body`, `labels?` | Issue | Planning |
| `link_issues` | `parent`, `child` | void | Planning |
| `create_pull_request` | `title`, `body`, `head`, `base` | PullRequest | Implementation |
| `update_pull_request` | `number`, `title?`, `body?` | PullRequest | Implementation |

### Tool Schemas

```typescript
// Read tool inputs
interface GetIssueInput {
  number: number;
}

interface GetCommentsInput {
  number: number;
  since?: string;  // ISO 8601 date
}

interface GetLinkedIssuesInput {
  number: number;
}

interface GetPullRequestInput {
  number: number;
}

interface GetReviewsInput {
  number: number;
}

interface GetReviewCommentsInput {
  number: number;
}

// Write tool inputs
interface PostCommentInput {
  number: number;
  body: string;
}

interface AddLabelInput {
  number: number;
  label: string;
}

interface RemoveLabelInput {
  number: number;
  label: string;
}

interface CreateIssueInput {
  title: string;
  body: string;
  labels?: string[];
}

interface LinkIssuesInput {
  parent: number;
  child: number;
}

interface CreatePullRequestInput {
  title: string;
  body: string;
  head: string;  // Branch name
  base: string;  // Target branch
}

interface UpdatePullRequestInput {
  number: number;
  title?: string;
  body?: string;
}

// Tool outputs (simplified from IPlatform types)
interface Issue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: string[];
  assignees: string[];
}

interface Comment {
  id: number;
  author: string;
  body: string;
  createdAt: string;
}

interface LinkedIssues {
  parent?: Issue;
  children: Issue[];
}

interface PullRequest {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed' | 'merged';
  head: string;
  base: string;
  mergeable: boolean | null;
}

interface Review {
  id: number;
  author: string;
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'PENDING';
  body: string;
}

interface ReviewComment {
  id: number;
  author: string;
  body: string;
  path: string;
  line: number;
}
```

### Tool Mapping

Tools map to the `IPlatform` interface:

| Tool | Maps To |
|------|---------|
| `get_issue` | `IPlatform.getIssue` |
| `get_comments` | `IPlatform.getComments` |
| `get_linked_issues` | `IPlatform.getLinkedIssues` |
| `get_pull_request` | `IPlatform.getPullRequest` |
| `get_reviews` | `IPlatform.getPullRequestReviews` |
| `get_review_comments` | `IPlatform.getReviewComments` |
| `post_comment` | `IPlatform.createComment` |
| `add_label` | `IPlatform.addLabel` |
| `remove_label` | `IPlatform.removeLabel` |
| `create_issue` | `IPlatform.createIssue` |
| `link_issues` | `IPlatform.linkIssues` |
| `create_pull_request` | `IPlatform.createPullRequest` |
| `update_pull_request` | `IPlatform.updatePullRequest` |

## Message Handling

When a user comments while an agent session is `RUNNING`, BullMQ queues the message as a job. When the agent suspends (outputs `ask_questions` or `submit_*`), the orchestrator delivers queued messages before resuming.

- **Queue**: `session:{sessionId}:messages`
- **Delivery**: FIFO order
- **On session failure**: Messages preserved for retry

## Retry Policy

Session retries are handled by BullMQ job options:

```typescript
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000  // 5s, 10s, 20s
  }
}
```

| Failure Type | Behavior |
|--------------|----------|
| Timeout, rate limit, transient network | Retryable — job retries with backoff |
| Invalid configuration, auth errors, agent crash | Terminal — session moves to `FAILED`, user notified |

## Dashboard API

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/sessions` | List sessions with optional filters (`?status=running&repo=owner/name`) |
| `GET` | `/api/sessions/:id` | Get session details |
| `POST` | `/api/sessions/:id/cancel` | Cancel a running session |
| `POST` | `/api/sessions/:id/retry` | Retry a failed session |
| `GET` | `/api/queue/stats` | Queue statistics (pending, active, failed counts) |

### WebSocket Events (Socket.IO)

Connect to `/` namespace, then join a session room:

```typescript
socket.emit('join', { sessionId: 'abc123' });

// Receive events
socket.on('log', (data: { sessionId: string; line: string; timestamp: Date }) => {});
socket.on('status', (data: { sessionId: string; status: SessionStatus }) => {});
socket.on('output', (data: { sessionId: string; output: AgentOutput }) => {});
```
