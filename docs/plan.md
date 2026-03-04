# Plan: AI Agent Infrastructure

## Context

Doma has 5 AI execs (Zuko/CTO, Iroh/CFO, Toph/COO, Sokka/CPO, Katara/CMO) defined in docs with workflow processes. Now we need a generic agent runtime: a single Docker container running agents, powered by `@anthropic-ai/claude-agent-sdk` (TS), with persona/skills from plugins, communicating via Slack. Deployable to a Mac Mini. The first agents are execs, but the infrastructure is agent-generic.

## Architecture

```
                 ┌──────────────────────────────────────────────────┐
                 │                Docker Compose                     │
                 │                                                   │
                 │  ┌─────────────┐     ┌───────┐                   │
Slack ──event──→ │  │ Data Source  │──→  │ Redis │  (BullMQ queue)   │
                 │  │ (Bolt SDK)  │     │       │                   │
                 │  └─────────────┘     └───┬───┘                   │
                 │                          │                        │
                 │  ┌─────────────┐     ┌───▼────────┐              │
                 │  │   Server    │     │   Worker    │              │
                 │  │ (Hono API)  │     │handle-event │              │
                 │  │ + BullBoard │     │ Agent SDK   │              │
                 │  └─────────────┘     │   query()   │              │
                 │                      └──────┬──────┘              │
                 │                             │                     │
                 │                    MCP tools (from plugins):       │
                 │                    - slack_send_message            │
                 │                    - write_doc, read_doc, etc.    │
                 └──────────────────────────────────────────────────┘
```

**Clean architecture, single compose stack (app + Redis).** The flow:
1. **Data sources** receive external events (Slack via Bolt SDK) and enqueue BullMQ jobs
2. **Workers** dequeue jobs and run through the `handle-event` use case
3. **Handle-event** routes the event to an agent (deterministic mapping, fallback: Toph/COO), resolves the agent's plugins, and calls Agent SDK `query()`
4. Agent produces outputs through **MCP tools** (slack_send_message, write_doc, etc.)
5. **Server** exposes API surface (direct invocation endpoint) + BullBoard for queue monitoring
6. Adding new input sources = adding new data sources, nothing else changes

## Repository Structure

```
kitchen/
├── package.json                      # deps: claude-agent-sdk, @slack/bolt, bullmq, hono, zod
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml                # app + redis (for BullMQ)
├── .env                              # secrets — gitignored
├── .kitchen.yaml                     # non-sensitive config (channel maps, agent defaults) — gitignored
├── .kitchen.example.yaml             # checked-in example of .kitchen.yaml
├── src/
│   ├── index.ts                      # bootstrap: start server, connect data sources, start workers
│   │
│   ├── data/
│   │   ├── source/                   # external integration adapters (INPUT only)
│   │   │   └── slack.source.ts       # Bolt SDK: listen for events, enqueue jobs
│   │   └── repository/              # entity-level data access
│   │       ├── agent.repository.ts   # agent config registry: name → plugins, domain, system prompt
│   │       └── queue.repository.ts   # BullMQ queue setup + enqueue helpers
│   │
│   ├── domain/
│   │   ├── entity/                   # domain objects — one file per entity
│   │   │   ├── agent-event.ts        # AgentEvent
│   │   │   ├── agent-config.ts       # AgentConfig
│   │   │   └── agent-result.ts       # AgentResult
│   │   └── usecase/                  # business logic
│   │       └── handle-event.use-case.ts  # route event → resolve agent → invoke Agent SDK query()
│   │
│   └── presentation/                 # API surface
│       ├── server.ts                 # Hono app setup
│       ├── routes/
│       │   ├── agent.routes.ts       # POST /agent/:name/invoke — direct agent invocation
│       │   └── health.routes.ts      # GET /health
│       └── bull-board.ts             # BullBoard dashboard at /admin/queues
│
└── scripts/
    └── doma.sh                       # CLI wrapper
```

**Flow:** Data source (Slack) → enqueue BullMQ job → worker dequeues → `handle-event` use case (route → resolve → invoke) → Agent SDK `query()` → MCP tools produce outputs.

BullBoard at `/admin/queues` provides visibility into job status, retries, and failures.

```
tech-marketplace/
├── .claude-plugin/
│   └── marketplace.json
└── plugins/
    ├── shared/                         # cross-cutting: tools + norms all execs need
    │   ├── .claude-plugin/
    │   │   └── plugin.json
    │   ├── agents/
    │   │   └── operating-norms.md      # shared operating instructions (refs workflow docs)
    │   ├── skills/
    │   │   └── status-update/
    │   │       └── SKILL.md
    │   └── .mcp.json                   # shared tools: slack_send_message, write_doc, read_doc
    │
    ├── domains/                        # domain-specific capabilities (tools, skills, knowledge)
    │   ├── engineering/
    │   │   ├── .claude-plugin/
    │   │   │   └── plugin.json
    │   │   ├── skills/
    │   │   │   ├── tech-review/
    │   │   │   │   └── SKILL.md
    │   │   │   └── architecture-design/
    │   │   │       └── SKILL.md
    │   │   └── .mcp.json               # engineering tools: run_code, git_ops, search_codebase
    │   ├── finance/
    │   │   ├── .claude-plugin/
    │   │   │   └── plugin.json
    │   │   ├── skills/
    │   │   │   └── financial-analysis/
    │   │   │       └── SKILL.md
    │   │   └── .mcp.json               # finance tools: spreadsheet_ops, budget_track
    │   ├── operations/
    │   │   ├── .claude-plugin/
    │   │   │   └── plugin.json
    │   │   ├── skills/
    │   │   │   └── process-design/
    │   │   │       └── SKILL.md
    │   │   └── .mcp.json               # ops tools: workflow_manage, vendor_evaluate
    │   ├── product/
    │   │   ├── .claude-plugin/
    │   │   │   └── plugin.json
    │   │   ├── skills/
    │   │   │   └── product-brief/
    │   │   │       └── SKILL.md
    │   │   └── .mcp.json               # product tools: user_research, feature_prioritize
    │   └── marketing/
    │       ├── .claude-plugin/
    │       │   └── plugin.json
    │       ├── skills/
    │       │   └── content-strategy/
    │       │       └── SKILL.md
    │       └── .mcp.json               # marketing tools: content_draft, market_research
    │
    └── agents/                         # persona definitions (who, not what)
        ├── zuko-cto/
        │   ├── .claude-plugin/
        │   │   └── plugin.json
        │   └── agents/
        │       └── zuko.md             # persona, personality, authority, handoff relationships
        ├── iroh-cfo/
        │   ├── .claude-plugin/
        │   │   └── plugin.json
        │   └── agents/
        │       └── iroh.md
        ├── toph-coo/
        │   ├── .claude-plugin/
        │   │   └── plugin.json
        │   └── agents/
        │       └── toph.md
        ├── sokka-cpo/
        │   ├── .claude-plugin/
        │   │   └── plugin.json
        │   └── agents/
        │       └── sokka.md
        └── katara-cmo/
            ├── .claude-plugin/
            │   └── plugin.json
            └── agents/
                └── katara.md
```

**Plugin composition per agent** — when Zuko is invoked, the runtime loads 3 plugins:
1. `shared/` — slack tools, doc tools, operating norms
2. `domains/engineering/` — engineering skills + domain tools
3. `agents/zuko-cto/` — Zuko's persona

This means: domain capabilities are reusable (a future engineering hire shares the engineering plugin), and agent personas are thin (just personality + authority + handoffs).

## Key Design Decisions

1. **Agent SDK wraps Claude Code** — agents get built-in tools (Read, Write, Edit, Bash, Grep, Glob) plus custom MCP tools from their plugins. Use `tools: { type: 'preset', preset: 'claude_code' }` and `systemPrompt: { type: 'preset', preset: 'claude_code', append: <agent-specific> }`.

2. **Three-layer plugin composition** — `shared` (cross-cutting tools + norms) + `domain` (capabilities) + `agent` (persona). All loaded via `plugins` array in `query()`.

3. **Docker Compose: app + Redis** — single app container + Redis for BullMQ. Agents are invoked per-job, not long-running processes.

4. **Docs access is a plugin concern** — doc tools (read_doc, write_doc) are provided via the shared plugin's MCP tools. Kitchen has no knowledge of docs or git — that's an implementation detail of the plugin layer.

5. **BullMQ for async processing** — Slack events enqueue jobs → workers process them. Gives us retries, visibility (BullBoard), and decoupled input from execution.

6. **`permissionMode: 'bypassPermissions'`** — agents run headless. Safety from scoped tool access + decision authority matrix.

7. **Single use case for event handling** — `handle-event` is the only use case. It routes the event to an agent (deterministic: channel map, @mention, or API field; fallback: Toph/COO), resolves plugins, and invokes Agent SDK. All inputs are generic events.

8. **Server as API surface** — Hono exposes `/agent/:name/invoke` for direct programmatic invocation + BullBoard at `/admin/queues` for monitoring.

## Implementation Phases

### Phase 1: Scaffold + First Agent (Zuko) — no Slack yet

Build the core agent runtime, shared plugin, engineering domain, and Zuko persona. Test with script invocation.

**Files to create:**

| File | Purpose |
|------|---------|
| `docs/initiatives/kitchen/plan.md` | This plan — written to docs for team reference |
| `kitchen/package.json` | Deps: `claude-agent-sdk`, `@slack/bolt`, `bullmq`, `hono`, `zod` |
| `kitchen/tsconfig.json` | TS config |
| `kitchen/src/domain/entity/agent-event.ts` | `AgentEvent` entity |
| `kitchen/src/domain/entity/agent-config.ts` | `AgentConfig` entity |
| `kitchen/src/domain/entity/agent-result.ts` | `AgentResult` entity |
| `kitchen/src/data/repository/agent.repository.ts` | Agent registry: name → plugins, domain mapping |
| `kitchen/src/data/repository/queue.repository.ts` | BullMQ queue setup + enqueue helpers |
| `kitchen/src/domain/usecase/handle-event.use-case.ts` | Route event → resolve agent → invoke Agent SDK `query()` |
| `kitchen/src/presentation/server.ts` | Hono app setup |
| `kitchen/src/presentation/routes/agent.routes.ts` | POST /agent/:name/invoke |
| `kitchen/src/presentation/routes/health.routes.ts` | GET /health |
| `kitchen/src/presentation/bull-board.ts` | BullBoard dashboard |
| `kitchen/src/index.ts` | Bootstrap: start server, workers, data sources |
| `kitchen/Dockerfile` | Node 20 + Claude Code CLI + app |
| `kitchen/docker-compose.yml` | App + Redis services, mounts plugins/ |
| `kitchen/.env` | Secrets: `ANTHROPIC_API_KEY`, `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN` (gitignored) |
| `kitchen/.kitchen.example.yaml` | Non-sensitive config: channel maps, agent defaults, paths |
| `tech-marketplace/plugins/shared/.claude-plugin/plugin.json` | Shared plugin manifest |
| `tech-marketplace/plugins/shared/agents/operating-norms.md` | Shared operating instructions |
| `tech-marketplace/plugins/shared/.mcp.json` | Shared tools: slack_send_message, write_doc |
| `tech-marketplace/plugins/shared/skills/status-update/SKILL.md` | Status update skill |
| `tech-marketplace/plugins/domains/engineering/.claude-plugin/plugin.json` | Engineering domain manifest |
| `tech-marketplace/plugins/domains/engineering/skills/tech-review/SKILL.md` | Tech review skill |
| `tech-marketplace/plugins/domains/engineering/skills/architecture-design/SKILL.md` | Architecture design skill |
| `tech-marketplace/plugins/domains/engineering/.mcp.json` | Engineering-specific tools |
| `tech-marketplace/plugins/agents/zuko-cto/.claude-plugin/plugin.json` | Zuko persona manifest |
| `tech-marketplace/plugins/agents/zuko-cto/agents/zuko.md` | Zuko persona + authority + handoffs |

**Verify:** `docker compose up` starts app + Redis. Hit `POST /agent/zuko/invoke` with a test message. Confirm 3 plugins load, Zuko responds with correct persona. BullBoard visible at `/admin/queues`.

### Phase 2: Slack Integration

Wire up Bolt SDK as a data source that enqueues jobs.

**Files to create:**

| File | Purpose |
|------|---------|
| `kitchen/src/data/source/slack.source.ts` | Bolt SDK: listen for events, enqueue BullMQ jobs |

**Update:** `src/index.ts` — start Slack data source. `.kitchen.example.yaml` — add Slack channel mappings.

**Verify:** Message in Zuko's Slack channel → job enqueued → worker invokes Zuko → responds in-thread via `slack_send_message` tool.

### Phase 3: Remaining Domains + Agents

**Domain plugins:** finance/, operations/, product/, marketing/ — each with skills + `.mcp.json`.

**Agent plugins:** iroh-cfo/, toph-coo/, sokka-cpo/, katara-cmo/ — thin persona definitions.

**Update:** `marketplace.json` — register all plugins.

**Verify:** Each agent responds with correct persona and domain capabilities.

### Phase 4: CLI + Polish

**Files to create:**

| File | Purpose |
|------|---------|
| `kitchen/scripts/doma.sh` | CLI wrapper |

**Operations:**

| Operation | Command | Rebuild? |
|-----------|---------|----------|
| Deploy | `doma up` | No (first run builds) |
| Update agent persona/skills | Edit plugin files → `doma restart` | No |
| Update shared docs | Edit `docs/` — immediate | No |
| Rebuild image | `doma rebuild` | Yes |
| View logs | `doma logs` | No |

## Files to Modify

| File | Change |
|------|--------|
| `tech-marketplace/.claude-plugin/marketplace.json` | Add shared + 5 domain + 5 agent plugin entries |
| `.gitignore` | Add `kitchen/.env`, `kitchen/.kitchen.yaml` |

## Verification

- [ ] `docker compose up` starts app + Redis successfully
- [ ] BullBoard accessible at `/admin/queues`
- [ ] `POST /agent/zuko/invoke` queues a job, worker processes it, Agent SDK loads 3 plugins
- [ ] Zuko responds with correct persona and domain knowledge
- [ ] Slack message in mapped channel → job enqueued → correct agent responds in-thread
- [ ] Undetermined routing target → job routes to Toph (COO)
- [ ] Editing a plugin file + `docker compose restart` picks up changes (no rebuild)
- [ ] All 5 agents routable and respond with domain-appropriate behavior
