# Phase 1: Scaffold + First Agent (Zuko)

Build the core agent runtime, shared plugin, engineering domain, and Zuko persona. No Slack yet — test via HTTP.

Reference: `docs/initiatives/kitchen/plan.md`

---

## Dependency Graph

```
T1 (scaffold)
├── T2 (entities)          ← parallel with T3
│   ├── T4 (config repo)
│   │   └── T5 (agent repo)
│   │       └── T7 (queue repo) ← also depends on T3, T6
│   │           └── T8 (use case)
│   │               └── T9 (presentation)
│   │                   └── T10 (bootstrap)
│   └── T6 (claude source)
├── T3 (plugins)           ← parallel with T2
├── T11 (docker)           ← independent after T1
└── T12 (gitignore)        ← independent
```

**Parallel groups:**
- T2 + T3 (entities and plugins are independent)
- T5 + T6 (both depend on T2, independent of each other)
- T11 + T12 (independent infrastructure)

---

## Ticket 1: Project scaffold

Create the kitchen project skeleton.

**Files to create:**

- `kitchen/package.json`
  - deps: `@anthropic-ai/claude-code-sdk`, `bullmq`, `hono`, `@hono/node-server`, `zod`, `ioredis`, `yaml`
  - devDeps: `typescript`, `tsx`, `@types/node`
  - scripts: `"dev": "tsx src/index.ts"`, `"build": "tsc"`, `"start": "node dist/index.js"`

- `kitchen/tsconfig.json`
  - target: ES2022, module: NodeNext, moduleResolution: NodeNext, outDir: dist, rootDir: src, strict: true, esModuleInterop: true

- `kitchen/.gitignore`
  - node_modules, dist, .env, .kitchen.yaml

- `kitchen/.kitchen.example.yaml`
  - Non-sensitive config template. Paths assume Docker container context (volumes mounted by docker-compose):
    ```yaml
    port: 3000
    redis:
      url: redis://redis:6379    # 'redis' = compose service name
    plugins:
      path: /plugins             # mounted volume in container
    agents:
      defaultAgent: toph         # fallback for unrouted events
      team:
        zuko:
          displayName: "Zuko"
    ```

**Verify:** `cd kitchen && npm install` succeeds.

**Blocks:** all other tickets.

---

## Ticket 2: Domain entities

Define core domain types. One file per entity.

**Files to create:**

- `kitchen/src/domain/entity/event-source.ts`
  ```ts
  export type ApiSource = { type: 'api' }
  export type SlackSource = { type: 'slack'; channelId: string; threadTs?: string; userId: string }
  export type EventSource = ApiSource | SlackSource
  ```

- `kitchen/src/domain/entity/agent-event.ts`
  ```ts
  import type { EventSource } from './event-source.ts'

  export interface AgentEvent {
    id: string
    source: EventSource
    agentName: string
    message: string
    timestamp: string           // ISO 8601
  }
  ```

- `kitchen/src/domain/entity/agent-config.ts`
  ```ts
  export interface AgentConfig {
    name: string                // agent ID, e.g. "zuko"
    displayName: string         // e.g. "Zuko"
    pluginPaths: string[]       // resolved absolute paths to plugins [shared, agents/{name}/]
  }
  ```

- `kitchen/src/domain/entity/agent-result.ts`
  ```ts
  export interface AgentResult {
    agentName: string
    eventId: string
    response: string
    durationMs: number
  }
  ```

- `kitchen/src/domain/entity/kitchen-config.ts`
  ```ts
  export interface KitchenConfig {
    port: number
    redis: { url: string }
    plugins: { path: string }
    agents: {
      defaultAgent: string
      team: Record<string, { displayName: string }>
    }
  }
  ```

**Depends on:** T1.
**Blocks:** T4, T5, T6.

---

## Ticket 3: Shared plugin + Engineering domain + Zuko persona

Create the three plugin directory structures with placeholder content. Actual content will be fleshed out later.

**Files to create:**

### Shared plugin (`tech-marketplace/plugins/shared/`)

- `.claude-plugin/plugin.json`
  ```json
  { "name": "shared", "description": "Cross-cutting tools and operating norms for all Doma agents" }
  ```
- `agents/operating-norms.md` — Placeholder: `# Operating Norms\n\nTODO`
- `skills/status-update/SKILL.md` — Placeholder: `# Status Update\n\nTODO`
- `.mcp.json` — Empty stub: `{ "mcpServers": {} }`

### Engineering domain (`tech-marketplace/plugins/domains/engineering/`)

- `.claude-plugin/plugin.json`
  ```json
  { "name": "engineering", "description": "Engineering domain capabilities" }
  ```
- `skills/tech-review/SKILL.md` — Placeholder: `# Tech Review\n\nTODO`
- `skills/architecture-design/SKILL.md` — Placeholder: `# Architecture Design\n\nTODO`
- `.mcp.json` — Empty stub: `{ "mcpServers": {} }`

### Zuko persona (`tech-marketplace/plugins/agents/zuko-cto/`)

- `.claude-plugin/plugin.json`
  ```json
  { "name": "zuko-cto", "description": "Zuko — CTO persona" }
  ```
- `agents/zuko.md` — Placeholder: `# Zuko — CTO\n\nTODO`

### Update existing file

- `tech-marketplace/.claude-plugin/marketplace.json` — Add entries for `shared`, `engineering`, and `zuko-cto` plugins.

**Depends on:** T1 (only loosely — plugin files are outside kitchen/).
**Blocks:** T5.

---

## Ticket 4: Config repository

Load and expose the kitchen configuration from `.kitchen.yaml` and environment variables.

**File to create:**

- `kitchen/src/data/repository/config.repository.ts`
  - Read `.kitchen.yaml` (with `yaml` package) from working directory
  - Read `ANTHROPIC_API_KEY` from env (falls back to `CLAUDE_CODE_OAUTH_TOKEN`)
  - Export `getConfig(): KitchenConfig` — returns parsed, validated config (cached after first read)
  - Import `KitchenConfig` from `../../domain/entity/kitchen-config.ts`

**Depends on:** T2.
**Blocks:** T5, T7.

---

## Ticket 5: Agent repository

Create the agent config registry that maps agent names to their plugin paths.

**File to create:**

- `kitchen/src/data/repository/agent.repository.ts`
  - Use `getConfig()` from `config.repository.ts` to read agent team + plugins path
  - Export `getAgentConfig(name: string): AgentConfig | undefined`
  - Export `getAllAgents(): AgentConfig[]`
  - Resolve `pluginPaths` from config: `[shared/, agents/{name}/]` relative to `plugins.path`
  - Import `AgentConfig` from `../../domain/entity/agent-config.ts`

**Depends on:** T2, T4.
**Blocks:** T6.

---

## Ticket 6: Claude source

Abstract the Claude Code SDK behind a data source.

**File to create:**

- `kitchen/src/data/source/claude.source.ts`
  - Export `invokeAgent(prompt: string, systemPrompt: string, onMessage: (msg) => void): Promise<string>` — returns final response text
  - Internally calls:
    ```ts
    import { query } from '@anthropic-ai/claude-code-sdk'

    const messages = query({
      prompt,
      options: {
        systemPrompt,
        permissionMode: 'bypassPermissions',
        maxTurns: 10,
      }
    })

    for await (const msg of messages) {
      onMessage(msg)
    }
    ```
  - The `onMessage` callback lets the caller handle logging without this layer knowing about BullMQ

**Depends on:** T2.
**Blocks:** T7.

---

## Ticket 7: Queue repository

Create the queue repository that owns the full job lifecycle: enqueueing, worker creation, and job processing.

**File to create:**

- `kitchen/src/data/repository/queue.repository.ts`
  - Use `getConfig()` from `config.repository.ts` to read `redis.url`
  - Create a BullMQ `Queue` named `agent-events`
  - Create a BullMQ `Worker` on `agent-events` at init — processor:
    - **Route:** If `event.agentName` is set, use it. Fallback: use `defaultAgent` from config.
    - **Resolve:** Get `AgentConfig` via `getAgentConfig()`. Read persona markdown from the agent's plugin (`agents/*.md`). Read operating norms from shared plugin (`agents/operating-norms.md`). Combine into system prompt.
    - **Invoke:** Call `invokeAgent()` from `claude.source.ts`, passing an `onMessage` callback that logs to the BullMQ job:
      ```ts
      const response = await invokeAgent(event.message, combinedSystemPrompt, (msg) => {
        if (msg.type === 'assistant') job.log(`[assistant] ${msg.message.content}`)
        if (msg.type === 'tool_use')  job.log(`[tool] ${msg.tool_name}`)
      })
      ```
  - Export `enqueueEvent(event: AgentEvent): Promise<string>` — adds job, returns job ID
  - Export `getQueue()` — returns the Queue instance (for bull-board in T8)
  - Export `closeWorker()` — for graceful shutdown in T9
  - Import `AgentEvent` from `../../domain/entity/agent-event.ts`
  - Import `getAgentConfig` from `./agent.repository.ts`
  - Import `invokeAgent` from `../source/claude.source.ts`

**Depends on:** T2, T3, T4, T5, T6.
**Blocks:** T8.

---

## Ticket 8: Handle-event use case

Create the use case with a single execute method.

**File to create:**

- `kitchen/src/domain/usecase/handle-event.use-case.ts`
  - Export `execute(event: AgentEvent): Promise<string>` — validates agent exists via `getAgentConfig()`, enqueues via `enqueueEvent()`, returns job ID
  - Import entities from `../entity/`
  - Import `getAgentConfig` from `../../data/repository/agent.repository.ts`
  - Import `enqueueEvent` from `../../data/repository/queue.repository.ts`

**Depends on:** T5, T7.
**Blocks:** T9.

---

## Ticket 9: Presentation layer

Create the HTTP server with health check, agent invocation endpoint, and BullBoard.

**Files to create:**

- `kitchen/src/presentation/routes/health.routes.ts`
  - `GET /health` returns `{ status: 'ok', timestamp: string }`

- `kitchen/src/presentation/routes/agent.routes.ts`
  - `POST /agent/:name/invoke` — accepts `{ message }`, constructs `AgentEvent` (with `ApiSource`), calls `execute()` from use case, returns `{ jobId, agentName }`
  - Import `execute` from `../../domain/usecase/handle-event.use-case.ts`

- `kitchen/src/presentation/bull-board.ts`
  - Set up `@bull-board/hono` with the `agent-events` queue
  - Export middleware to mount at `/admin/queues`
  - Add `@bull-board/api` and `@bull-board/hono` to package.json deps (note: T1 scaffold may need updating)

- `kitchen/src/presentation/server.ts`
  - Create Hono app, mount health routes, agent routes, and BullBoard
  - Export `createApp()` returning the Hono instance

**Depends on:** T7, T8.
**Blocks:** T10.

---

## Ticket 10: Bootstrap

Create the main entry point that wires everything together.

**File to create:**

- `kitchen/src/index.ts`
  - Use `getConfig()` from config repository
  - Call `createApp()` to get Hono app
  - Start HTTP server with `@hono/node-server` `serve()` on configured port
  - Log startup info: port, redis URL, registered agents
  - Handle graceful shutdown (SIGTERM/SIGINT): call `closeWorker()` from queue repository, close server

**Depends on:** T9.

---

## Ticket 11: Docker

Create Dockerfile and docker-compose.yml.

**Files to create:**

- `kitchen/Dockerfile`
  - Base: `node:20-slim`
  - Install git (for plugin tools that may need it)
  - Copy package.json + package-lock.json, run `npm ci`
  - Copy src/
  - CMD: `npx tsx src/index.ts`

- `kitchen/docker-compose.yml`
  - Service `app`: build from `.`, ports `3000:3000`, env_file `.env`, volumes mount `../.kitchen.yaml:/app/.kitchen.yaml:ro` and `../tech-marketplace/plugins:/plugins:ro`
  - Service `redis`: `redis:7-alpine`, port `6379`

**Depends on:** T1.

---

## Ticket 12: Root gitignore

Update the root `.gitignore` to exclude kitchen secrets/config.

**File to update:**

- `.gitignore` — Add:
  ```
  kitchen/.env
  kitchen/.kitchen.yaml
  ```

**Independent** — can run anytime.

---

## Verification

After all tickets complete:

- [ ] `cd kitchen && npm install` succeeds
- [ ] `npx tsx src/index.ts` starts the server (requires Redis running + `.kitchen.yaml` + `.env`)
- [ ] `GET /health` returns `{ status: 'ok' }`
- [ ] `POST /agent/zuko/invoke` with `{ "message": "Hello Zuko" }` enqueues a job and returns `{ jobId, agentName }`
- [ ] Worker picks up the job, loads 3 plugins (shared + engineering + zuko-cto), invokes Agent SDK
- [ ] BullBoard visible at `/admin/queues`
- [ ] `docker compose up --build` starts app + Redis
