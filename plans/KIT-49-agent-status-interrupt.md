# One Pager: Agent Status Panel with Interrupt

## Context

**Ticket:** https://linear.app/doma-cooking/issue/KIT-49/admin-dashboard-agent-status-panel-with-interrupt-button

Operators have no way to see what agents are currently running or cancel a runaway job without going into Redis or BullMQ internals. This adds an agent status panel above the Bull Board iframe on `/admin/queues` with a per-job interrupt button.

## Approach

Three layers of change:

1. **`ClaudeSource`** — thread an `AbortController` into `invokeAgent()` and pass it to `query()`. The SDK already supports `abortController` in options (confirmed in `sdk.d.ts:640`).

2. **`EventRepository`** — maintain `activeControllers: Map<string, AbortController>` keyed by `stationId`. Re-key `activeLocks` from `lockId` → `stationId` for consistency. Expose `interrupt(stationId)` and `releaseLock(stationId)`.

3. **`MetricsRoutes`** — inject `EventRepository`, render an agent status panel above the iframe via HTMX polling, add `POST /admin/interrupt/:jobId`.

### Key Decisions

**Where does the interrupt endpoint live?** `MetricsRoutes` already owns the `/admin/queues` page render. Adding `EventRepository` as a second dependency keeps everything in one class without a new routing file. If admin routes grow further, extract to `AdminRoutes` then.

**Active vs. queued jobs:** `job.remove()` throws on active jobs. Active jobs are interrupted via `AbortController.abort()` — the worker's `finally` block still runs (lock release, workspace snapshot, log write). Queued/delayed jobs are removed with `job.remove()` directly; no lock exists so `releaseLock` is a no-op.

**Lock release for active jobs:** The `finally` block in the worker handles lock release after abort. The endpoint does not call `releaseLock` for active jobs to avoid a race condition with the `finally` cleanup.

**HTMX polling:** The status panel polls `GET /admin/queues/active` every 3 seconds for a lightweight HTML fragment — same pattern as the metrics table. No WebSocket complexity.

**`activeLocks` re-keying:** Currently keyed by `job.id ?? randomUUID()`. Changing the key to `stationId` lets `releaseLock(stationId)` work without scanning the map and aligns with how `activeControllers` is keyed.

## Implementation Steps

1. **`ClaudeSource`** — add optional `abortController?: AbortController` to `invokeAgent()` and `executeQuery()`; pass it to `query()` options.

2. **`EventRepository`** — re-key `activeLocks` to `stationId`; add `activeControllers` map; create + store an `AbortController` per job before calling `invokeAgent()`; delete both map entries in `finally`; update `closeWorkers()` to abort all active controllers; add `interrupt(stationId)` and `releaseLock(stationId)`.

3. **`MetricsRoutes`** — accept `EventRepository` as second constructor param; add `GET /admin/queues/active` fragment endpoint (lists active jobs with agent ID, job ID, trigger, elapsed time, interrupt button); update `queuesPage()` to embed the panel with HTMX 3s polling; add `POST /admin/interrupt/:jobId` (get job → check state → abort or remove → return 204).

4. **`dependencies.ts`** — pass `eventRepository` as second arg to `MetricsRoutes`.

## Testing Strategy

- Start the server with a long-running agent job, open `/admin/queues`, confirm the panel shows the job with elapsed time auto-updating.
- Click Interrupt on an active job — confirm the panel clears, the worker logs a failure, the Redis lock is released (check via `redis-cli`), and the workspace is snapshotted.
- Click Interrupt on a queued/delayed job — confirm it disappears from the Bull Board without a worker error.
- With no active jobs, confirm the panel shows the empty state.
- Verify Basic Auth still required on the interrupt endpoint.

## Risks & Open Questions

- **Abort propagation latency:** `AbortController.abort()` signals the SDK to stop; it may take a turn or two before the agent process exits. The panel will show the job as still active briefly after interrupt. Acceptable for now.
- **`closeWorkers()` race:** If the server shuts down mid-run, aborting all controllers + `worker.close()` may cause double lock-release attempts. The Redis lock TTL is a safety net; the `redisLock.releaseAll` call is idempotent in practice.
- **Multiple workers:** `activeControllers` is per-process. With multiple worker processes this would need a different mechanism (out of scope; current deployment is single-process).
