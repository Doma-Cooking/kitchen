# KIT-15: Prawn — Cron Job Scheduler for Agent Events

## Overview

Prawn is a cron-based scheduler that allows each agent to configure scheduled triggers via `.kitchen.yaml`. Each schedule entry fires at a cron expression and invokes a skill on the target agent — producing an `AgentEvent` consistent with the existing trigger pattern.

The scheduler is a new route class (`SchedulerRoutes`) that mirrors how `SlackRoutes` works: started at boot, iterates all agents, registers cron jobs, and enqueues events via `HandleEventUseCase`.

---

## Architecture

### New Trigger Type

Add `CronTrigger` to the `EventTrigger` union in `event-trigger.ts`:

```typescript
export type CronTrigger = { type: 'cron'; cron: string; scheduleName?: string }
export type EventTrigger = ApiTrigger | SlackTrigger | AgentTrigger | CronTrigger
```

Update `triggerToString()` to handle it:

```typescript
case 'cron':
  return `[Source: cron | expression: ${trigger.cron}${trigger.scheduleName ? ` | name: ${trigger.scheduleName}` : ''}]`
```

This makes cron-triggered events distinguishable in logs and BullBoard, and gives agents clear context about why they were invoked.

---

### Config Schema

Add `schedules` to the per-agent config in `.kitchen.yaml`:

```yaml
agents:
  team:
    toph:
      schedules:
        - cron: "0 9 * * 1-5"        # 9am Mon–Fri
          skill: daily-standup
          name: morning-standup       # optional label
          stationId: toph-standup     # optional — defaults to agentId
        - cron: "0 17 * * 5"          # 5pm Friday
          skill: weekly-digest
```

Fields:
- `cron` (required): Standard 5-field cron expression
- `skill` (required): Skill name to invoke — becomes the agent message as `/${skill}`
- `name` (optional): Human label, used in logs and trigger context
- `stationId` (optional): Station to use for the event; defaults to `agentId`

The agent receives the message `"/${skill}"`, which matches the standard skill invocation pattern agents already use from Slack.

---

### Type Changes

**`src/domain/entity/agent-config.ts`** — add `ScheduleConfig` interface and `schedules` field:

```typescript
export interface ScheduleConfig {
  cron: string
  skill: string
  name?: string
  stationId?: string
}

export interface AgentConfig {
  // ... existing fields
  schedules?: ScheduleConfig[]
}
```

**`src/domain/entity/kitchen-config.ts`** — add `schedules` to team member type:

```typescript
agents: {
  team: Record<string, {
    // ... existing fields
    schedules?: ScheduleConfig[]
  }>
}
```

**`src/data/repository/config.repository.ts`** — parse `schedules` from YAML agent config and pass through to resolved team config. No env var resolution needed — schedules are static config.

---

### SchedulerRoutes

New file: `src/presentation/routes/scheduler.routes.ts`

```typescript
import { Cron } from 'croner'
import type { AgentRepository } from '../../data/repository/agent.repository.js'
import type { HandleEventUseCase } from '../../domain/usecase/handle-event.use-case.js'
import type { AgentEvent } from '../../domain/entity/agent-event.js'

export class SchedulerRoutes {
  private readonly jobs: Cron[] = []

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly handleEventUseCase: HandleEventUseCase,
  ) {}

  start(): void {
    const agents = this.agentRepository.getAllAgents()

    for (const agent of agents) {
      if (!agent.schedules?.length) continue

      for (const schedule of agent.schedules) {
        const job = new Cron(schedule.cron, async () => {
          const event: AgentEvent = {
            id: crypto.randomUUID(),
            trigger: { type: 'cron', cron: schedule.cron, scheduleName: schedule.name },
            agentId: agent.id,
            stationId: schedule.stationId,
            message: `/${schedule.skill}`,
            timestamp: new Date().toISOString(),
          }
          await this.handleEventUseCase.execute(event)
        })

        this.jobs.push(job)
        console.log(`Cron job scheduled: ${agent.id} "${schedule.name ?? schedule.skill}" @ ${schedule.cron}`)
      }
    }
  }

  stop(): void {
    for (const job of this.jobs) {
      job.stop()
    }
    this.jobs.length = 0
    console.log('Cron jobs stopped')
  }
}
```

`croner` is preferred over `node-cron` — it's TypeScript-native, actively maintained, handles DST correctly, and has no peer dependency issues.

---

### Wiring

**`src/dependencies.ts`** — add `SchedulerRoutes`:

```typescript
import { SchedulerRoutes } from './presentation/routes/scheduler.routes.js'

export const schedulerRoutes = new SchedulerRoutes(agentRepository, handleEventUseCase)
```

**`src/index.ts`** — start and stop alongside `slackRoutes`:

```typescript
import { schedulerRoutes } from './dependencies.js'

schedulerRoutes.start()  // synchronous — no await needed

async function shutdown(): Promise<void> {
  schedulerRoutes.stop()
  await slackRoutes.stop()
  // ... rest of shutdown
}
```

Note: `SchedulerRoutes.start()` is synchronous (unlike `SlackRoutes.start()` which is async). Cron jobs register immediately; no I/O at startup.

---

## Dependency

Add `croner` to `package.json`:

```json
"croner": "latest"
```

`croner` is ~20KB, zero dependencies, and ships with full TypeScript types.

---

## Example Config

`.kitchen.example.yaml` addition:

```yaml
    toph:
      # ... existing config
      schedules:
        - cron: "0 9 * * 1-5"
          skill: daily-standup
          name: morning-standup
        - cron: "0 17 * * 5"
          skill: weekly-digest
          name: friday-digest
          stationId: toph-weekly
```

---

## Files Changed

| File | Change |
|---|---|
| `src/domain/entity/event-trigger.ts` | Add `CronTrigger` type; update `triggerToString()` |
| `src/domain/entity/agent-config.ts` | Add `ScheduleConfig` interface; add `schedules` to `AgentConfig` |
| `src/domain/entity/kitchen-config.ts` | Add `schedules` to team member type |
| `src/data/repository/config.repository.ts` | Parse `schedules` from YAML; pass through in resolved config |
| `src/presentation/routes/scheduler.routes.ts` | **New** — `SchedulerRoutes` class |
| `src/dependencies.ts` | Instantiate and export `schedulerRoutes` |
| `src/index.ts` | Call `schedulerRoutes.start()` / `schedulerRoutes.stop()` |
| `.kitchen.example.yaml` | Add example `schedules` block |
| `package.json` | Add `croner` dependency |

---

## Implementation Steps

1. Install `croner` and add to `package.json`
2. Add `CronTrigger` to `event-trigger.ts` and update `triggerToString()`
3. Add `ScheduleConfig` and update `AgentConfig` in `agent-config.ts`
4. Update `kitchen-config.ts` team type
5. Update `config.repository.ts` to parse and pass through `schedules`
6. Implement `SchedulerRoutes` in `scheduler.routes.ts`
7. Wire into `dependencies.ts` and `index.ts`
8. Update `.kitchen.example.yaml` with example schedules
9. `tsc --noEmit` — zero errors

---

## Considerations

**Timezone**: `croner` defaults to local system time. If Kitchen runs in UTC (typical for containers), cron expressions should be authored in UTC. Document this in `.kitchen.example.yaml` comments.

**Missed jobs on restart**: If Kitchen restarts mid-schedule, jobs that fired while down are not replayed. This is acceptable for current use cases (standups, digests). If replay becomes necessary, a persistent cron state store (e.g., recording last-fired timestamps in Postgres) can be added later.

**Overlapping executions**: If a job fires while a previous instance is still running (station locked), the new event queues behind it via the existing BullMQ + Redis lock mechanism — no special handling needed in `SchedulerRoutes`.

**No new UI needed**: BullBoard already surfaces all enqueued jobs. Cron-triggered events are identifiable by their `CronTrigger` source metadata.
