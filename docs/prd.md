# Kitchen — Product Requirements Document

## Overview

Kitchen is a dockerized service that enables AI-powered software development workflows driven entirely through GitHub. Developers work in their familiar GitHub environment—project boards, issues, and pull requests—while AI agents handle planning and implementation tasks in the background. The system emphasizes human oversight: agents produce artifacts and recommendations, but users control all state transitions.

## Problem Statement

Current AI coding assistants require developers to context-switch between their IDE, terminal, and project management tools. Teams want AI assistance integrated into their existing GitHub-centric workflows without learning new interfaces or sacrificing control over their codebase. The system should feel like a team member who picks up tickets, asks clarifying questions, and submits work for review—not an autonomous system that makes decisions on behalf of the team.

## Goals

- **GitHub-native**: All interaction happens through issues, PRs, and project board movements
- **Human-in-the-loop**: Agents never move tickets, merge PRs, or mark work complete—users retain full control
- **Observable**: Real-time dashboard showing agent activity, costs, and session history
- **Configurable**: Per-repository prompts, output formats, labels, and notification settings
- **Extensible**: Provider interfaces allow swapping AI backends, Git hosts, and notification channels

## User Workflow

Issues flow through two main phases driven by project board column movements:

1. **Planning**: User moves issue to Planning → agent analyzes and proposes a technical plan → user reviews and approves
2. **Implementation**: User moves issue to Implementing → agent creates branch/PR and implements → user reviews and merges

The system emphasizes human control: agents produce artifacts and recommendations, but users control all state transitions. Agents never move tickets, merge PRs, or mark work complete.

See [User Workflow](./workflow.md) for detailed phase diagrams and sub-issue handling.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PLATFORM                                       │
│   Project Board (To Do → Planning → Ready → Implementing → Done)            │
│   Issues (planning Q&A)  •  Pull Requests (implementation Q&A + reviews)    │
└─────────────────────────────────────────────────────────────────────────────┘
                                         │ webhooks
┌────────────────────────────────────────▼────────────────────────────────────┐
│                           ORCHESTRATOR CONTAINER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐   │
│  │  IPlatform   │  │   BullMQ     │  │   Session    │  │   Dashboard    │   │
│  │  (webhooks)  │→ │   Queues     │→ │   Manager    │  │   (React)      │   │
│  └──────────────┘  └──────────────┘  └──────┬───────┘  └────────────────┘   │
│                                             │          ┌────────────────┐   │
│  ┌──────────────┐  ┌──────────────┐         │          │   INotifier    │   │
│  │IAgentProvider│  │ IGitProvider │←────────┘          │    (Slack)     │   │
│  │   (Docker)   │  │  (Git CLI)   │                    └────────────────┘   │
│  └──────────────┘  └──────────────┘                                         │
└─────────────────────────────────────────────────────────────────────────────┘
           │ docker run (sibling containers)
┌──────────▼──────────────────────────────────────────────────────────────────┐
│                         AGENT CONTAINERS                                    │
│   • One container per session (isolated workspace)                          │
│   • Clone repo, load config, run Claude Code                                │
│   • Execute GitHub API actions (comments, issues, PRs)                      │
│   • Commit and push changes, persist session state                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Provider Interfaces

The system abstracts all external dependencies behind interfaces for testability and future extensibility:

| Interface | Responsibility | Initial Implementation |
|-----------|---------------|----------------------|
| `IPlatform` | Webhooks (orchestrator), GitHub API (containers) | GitHub |
| `IAgentProvider` | Spawn/cancel agent containers | Docker |
| `IGitProvider` | Create branches | Git CLI / GitHub API |
| `INotifier` | Send notifications | Slack |
| `ISessionStorage` | Persist session state | MinIO (S3-compatible) |

See [Architecture Reference](./architecture.md#provider-interfaces) for full interface definitions.

## Agent Output Schema

Agents produce structured JSON output with an optional progress summary and a required terminal action (`ask_questions`, `submit_plan`, or `submit_implementation`). Agents never emit "complete" or "move" actions—they submit work, and users decide next steps.

See [Architecture Reference](./architecture.md#agent-output-schema) for the full schema definition.

## Session Lifecycle

| State | Trigger | Description |
|-------|---------|-------------|
| `QUEUED` | Column move webhook | Session created, waiting for container |
| `RUNNING` | Container started | Agent actively working |
| `WAITING_FOR_USER` | Agent outputs `ask_questions` or `submit_*` | Agent has asked questions OR submitted work; awaiting user response or approval |
| `COMPLETED` | User moves ticket to next column | Session closed (Planning → Ready, or Implementing → Done) |
| `FAILED` | Agent error, timeout | Session failed; may retry |

**State transitions:**
- `QUEUED` → `RUNNING` (container starts)
- `RUNNING` → `WAITING_FOR_USER` (agent suspends) or `FAILED` (error)
- `WAITING_FOR_USER` → `RUNNING` (user responds, agent resumes) or `COMPLETED` (user approves by moving ticket)
- `FAILED` → `QUEUED` (retry)

When an agent is `RUNNING` and a user comments, the message is queued and delivered when the agent next suspends.

## Configuration

Kitchen is configured via a `.github/kitchen.yml` file in each repository. This file controls agent behavior, column mappings, labels, templates, prompts, and notifications.

See [Configuration](./configuration.md) for the full configuration reference and examples.

## Dashboard

A web-based dashboard provides real-time visibility:

- **Session list**: Active/waiting/completed sessions with status, cost, duration
- **Live logs**: Streamed agent output for running sessions
- **Queue status**: Pending jobs, retry counts, failed jobs
- **Controls**: Cancel running sessions, retry failed sessions

## Infrastructure

| Component | Technology | Purpose |
|-----------|------------|---------|
| Orchestrator | Node.js / TypeScript | Webhook handling, session management |
| Job Queue | BullMQ + Redis | Reliable job processing, retries |
| Session Storage | MinIO | S3-compatible storage for Claude session state |
| Agent Containers | Docker (DooD) | Isolated execution environments |
| Dashboard | React + Socket.IO | Real-time monitoring UI |

## Non-Goals (v1)

- Auto-merging PRs or auto-closing issues
- Multiple agents collaborating on the same issue
- Support for non-GitHub platforms (GitLab, Bitbucket)
- Agent-to-agent communication

## Success Metrics

- **Adoption**: Number of repositories with `.github/kitchen.yml`
- **Throughput**: Issues planned and implemented per week
- **Efficiency**: Average time from Planning → PR merged
- **Quality**: PR approval rate on first review
- **Cost**: Average Claude API cost per issue