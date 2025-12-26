# Kitchen

Kitchen is a dockerized service that enables AI-powered software development through a source control platform. Developers use their familiar environment (project boards, issues, PRs) while AI agents handle planning and implementation in the background.

## Core Principles

- **Project-native**: All interaction via issues, PRs, and project board movements
- **Human-in-the-loop**: Agents never move tickets, merge PRs, or mark work complete
- **Observable**: Real-time dashboard shows agent activity, costs, and session history

## Workflow

Issues flow through two phases driven by project board column movements:

1. **Planning**: User moves issue to Planning column → agent analyzes and proposes a plan → user reviews and approves
2. **Implementation**: User moves issue to Implementing column → agent creates branch/PR and implements → user reviews and merges

## Architecture

```
GitHub (webhooks) → Orchestrator Container → Agent Containers (Docker)
                         ↓
              BullMQ + Redis (job queue)
              MinIO (session storage)
              React Dashboard (monitoring)
```

## Configuration

Per-repository configuration via `.github/kitchen.yml`.

## Documentation

- [Product Requirements](./docs/prd.md) - Goals, user workflow, and system overview
- [Architecture](./docs/architecture.md) - Interface definitions and schemas
- [Workflow](./docs/workflow.md) - Detailed phase diagrams
- [Configuration](./docs/configuration.md) - Full configuration reference
- [Deployment](./docs/deployment.md) - Docker deployment and infrastructure setup
