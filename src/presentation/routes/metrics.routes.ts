import { Hono, type Context } from 'hono'
import type { LogRepository } from '../../data/repository/log.repository.js'
import type { EventRepository } from '../../data/repository/event.repository.js'
import type { TaskMetric } from '../../domain/entity/task-log.js'
import { ADMIN_PATH, ACTIVE_JOBS_PATH, DASHBOARD_BOARD_PATH, DASHBOARD_PATH, INTERRUPT_PATH, METRICS_PATH } from './routes.js'

const RANGES: Record<string, { label: string; hours: number }> = {
  '24h': { label: 'Last 24 hours', hours: 24 },
  '7d': { label: 'Last 7 days', hours: 168 },
  '30d': { label: 'Last 30 days', hours: 720 },
}

const SHARED_STYLES = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; font-size: 14px; background: #f5f5f5; color: #111; }
    header { background: #111; color: #fff; padding: 12px 24px; display: flex; align-items: center; gap: 24px; }
    header a { color: #aaa; text-decoration: none; font-size: 13px; }
    header a:hover { color: #fff; }
    h1 { font-size: 16px; font-weight: 600; }`

const SHARED_NAV = `
  <header>
    <h1>Kitchen Admin</h1>
    <a href="${DASHBOARD_PATH}">Queue Inspector</a>
    <a href="${METRICS_PATH}">Metrics</a>
  </header>`

export class MetricsRoutes {
  readonly router: Hono

  constructor(
    private readonly logRepository: LogRepository,
    private readonly eventRepository: EventRepository,
  ) {
    this.router = new Hono()
    this.router.get(ADMIN_PATH, (c) => c.redirect(DASHBOARD_PATH))
    this.router.get(DASHBOARD_PATH, (c) => this.queuesPage(c))
    this.router.get(ACTIVE_JOBS_PATH, (c) => this.activeJobsFragment(c))
    this.router.post(`${INTERRUPT_PATH}/:jobId`, (c) => this.interruptJob(c))
    this.router.get(METRICS_PATH, (c) => this.fullPage(c))
    this.router.get(`${METRICS_PATH}/table`, (c) => this.tableFragment(c))
  }

  private queuesPage(c: Context): Response {
    return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kitchen — Queue Inspector</title>
  <script src="https://unpkg.com/htmx.org@2.0.4/dist/htmx.min.js"></script>
  <style>${SHARED_STYLES}
    body { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
    .active-panel { flex: 0 0 auto; padding: 12px 24px; background: #fff; border-bottom: 1px solid #e5e5e5; }
    .active-panel h2 { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: #555; margin-bottom: 8px; }
    .active-panel table { width: 100%; border-collapse: collapse; }
    .active-panel th { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: #888; padding: 4px 10px 4px 0; text-align: left; }
    .active-panel td { padding: 4px 10px 4px 0; font-size: 13px; }
    .active-panel .empty { color: #aaa; font-size: 13px; }
    .interrupt-btn { padding: 2px 10px; font-size: 12px; background: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; border-radius: 4px; cursor: pointer; }
    .interrupt-btn:hover { background: #fecaca; }
    iframe { flex: 1; border: none; }
  </style>
</head>
<body>
  ${SHARED_NAV}
  <div
    class="active-panel"
    hx-get="${ACTIVE_JOBS_PATH}"
    hx-trigger="load, every 3s"
    hx-swap="innerHTML"
  ></div>
  <iframe src="${DASHBOARD_BOARD_PATH}" title="Queue Inspector"></iframe>
</body>
</html>`)
  }

  private async activeJobsFragment(c: Context): Promise<Response> {
    const queue = this.eventRepository.getQueue()
    const [activeJobs, waitingJobs, delayedJobs] = await Promise.all([
      queue.getActive(),
      queue.getWaiting(),
      queue.getDelayed(),
    ])
    return c.html(renderJobsPanel(activeJobs, [...waitingJobs, ...delayedJobs]))
  }

  private async interruptJob(c: Context): Promise<Response> {
    const jobId = c.req.param('jobId')
    if (!jobId) return c.json({ error: 'Missing jobId' }, 400)

    const queue = this.eventRepository.getQueue()
    const job = await queue.getJob(jobId)

    if (!job) {
      return c.json({ error: 'Job not found' }, 404)
    }

    const state = await job.getState()
    const stationId = (job.data.stationId ?? job.data.agentId) as string

    if (state === 'active') {
      this.eventRepository.interrupt(stationId)
    } else {
      await job.remove()
    }

    return c.body(null, 204)
  }

  private async fullPage(c: Context): Promise<Response> {
    const range = c.req.query('range') ?? '7d'
    const metrics = await this.fetchMetrics(range)
    return c.html(renderPage(metrics, range))
  }

  private async tableFragment(c: Context): Promise<Response> {
    const range = c.req.query('range') ?? '7d'
    const metrics = await this.fetchMetrics(range)
    return c.html(renderTable(metrics))
  }

  private async fetchMetrics(range: string): Promise<TaskMetric[]> {
    const hours = RANGES[range]?.hours ?? RANGES['7d'].hours
    const from = new Date(Date.now() - hours * 60 * 60 * 1000)
    return this.logRepository.getMetrics({ from })
  }
}

type QueueJob = Awaited<ReturnType<ReturnType<EventRepository['getQueue']>['getActive']>>[number]

function renderJobsPanel(activeJobs: QueueJob[], queuedJobs: QueueJob[]): string {
  const now = Date.now()

  const activeSection = (() => {
    if (activeJobs.length === 0) {
      return `<h2>Active</h2><p class="empty">No active executions</p>`
    }
    const rows = activeJobs.map((job) => {
      const agentId = escHtml(job.data.agentId ?? '—')
      const stationId = escHtml(job.data.stationId ?? job.data.agentId ?? '—')
      const trigger = escHtml(job.data.trigger?.type ?? '—')
      const elapsed = job.processedOn ? formatElapsed(now - job.processedOn) : '—'
      return `  <tr>
    <td>${agentId}</td>
    <td>${stationId}</td>
    <td>${trigger}</td>
    <td>${elapsed}</td>
    <td>
      <button
        class="interrupt-btn"
        hx-post="${INTERRUPT_PATH}/${escHtml(job.id ?? '')}"
        hx-target="closest .active-panel"
        hx-swap="innerHTML"
        hx-confirm="Interrupt this job?"
      >Interrupt</button>
    </td>
  </tr>`
    }).join('\n')
    return `<h2>Active</h2>
<table>
  <thead><tr><th>Agent</th><th>Station</th><th>Trigger</th><th>Elapsed</th><th></th></tr></thead>
  <tbody>
${rows}
  </tbody>
</table>`
  })()

  const queuedSection = (() => {
    if (queuedJobs.length === 0) {
      return `<h2 style="margin-top:12px">Queued</h2><p class="empty">No queued jobs</p>`
    }
    const rows = queuedJobs.map((job) => {
      const agentId = escHtml(job.data.agentId ?? '—')
      const stationId = escHtml(job.data.stationId ?? job.data.agentId ?? '—')
      const trigger = escHtml(job.data.trigger?.type ?? '—')
      const status = job.delay && job.delay > 0 ? 'delayed' : 'waiting'
      return `  <tr>
    <td>${agentId}</td>
    <td>${stationId}</td>
    <td>${trigger}</td>
    <td>${status}</td>
    <td>
      <button
        class="interrupt-btn"
        hx-post="${INTERRUPT_PATH}/${escHtml(job.id ?? '')}"
        hx-target="closest .active-panel"
        hx-swap="innerHTML"
        hx-confirm="Remove this job?"
      >Remove</button>
    </td>
  </tr>`
    }).join('\n')
    return `<h2 style="margin-top:12px">Queued</h2>
<table>
  <thead><tr><th>Agent</th><th>Station</th><th>Trigger</th><th>Status</th><th></th></tr></thead>
  <tbody>
${rows}
  </tbody>
</table>`
  })()

  return `${activeSection}\n${queuedSection}`
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function renderPage(metrics: TaskMetric[], selectedRange: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kitchen — Metrics</title>
  <script src="https://unpkg.com/htmx.org@2.0.4/dist/htmx.min.js"></script>
  <style>${SHARED_STYLES}
    main { padding: 24px; }
    .toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    label { font-weight: 500; }
    select { padding: 6px 10px; border: 1px solid #ccc; border-radius: 4px; background: #fff; font-size: 14px; cursor: pointer; }
    table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    th { background: #f0f0f0; text-align: left; padding: 10px 14px; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: #555; }
    td { padding: 10px 14px; border-top: 1px solid #eee; }
    tr:hover td { background: #fafafa; }
    .rate-good { color: #16a34a; font-weight: 600; }
    .rate-warn { color: #d97706; font-weight: 600; }
    .rate-bad  { color: #dc2626; font-weight: 600; }
    .empty { padding: 32px; text-align: center; color: #888; background: #fff; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    .htmx-indicator { opacity: 0; transition: opacity 200ms; }
    .htmx-request .htmx-indicator { opacity: 1; }
  </style>
</head>
<body>
  ${SHARED_NAV}
  <main>
    <div class="toolbar">
      <label for="range">Time range</label>
      <select
        id="range"
        name="range"
        hx-get="${METRICS_PATH}/table"
        hx-target="#metrics-table"
        hx-trigger="change"
        hx-include="[name='range']"
        hx-indicator="#spinner"
      >
        ${Object.entries(RANGES).map(([value, { label }]) =>
          `<option value="${value}"${value === selectedRange ? ' selected' : ''}>${label}</option>`
        ).join('\n        ')}
      </select>
      <span id="spinner" class="htmx-indicator" style="color:#888">Loading…</span>
    </div>
    <div id="metrics-table">
      ${renderTable(metrics)}
    </div>
  </main>
</body>
</html>`
}

function renderTable(metrics: TaskMetric[]): string {
  if (metrics.length === 0) {
    return `<p class="empty">No task log data for this time range.</p>`
  }

  const rows = metrics.map((m) => {
    const rateClass = m.successRate >= 95 ? 'rate-good' : m.successRate >= 80 ? 'rate-warn' : 'rate-bad'
    const duration = m.avgDurationMs >= 1000
      ? `${(m.avgDurationMs / 1000).toFixed(1)}s`
      : `${m.avgDurationMs}ms`
    return `    <tr>
      <td>${escHtml(m.agentId)}</td>
      <td>${escHtml(m.taskType)}</td>
      <td>${m.total}</td>
      <td class="${rateClass}">${m.successRate}%</td>
      <td>${m.failureCount}</td>
      <td>${duration}</td>
    </tr>`
  }).join('\n')

  return `<table>
  <thead>
    <tr>
      <th>Agent</th>
      <th>Task Type</th>
      <th>Total</th>
      <th>Success Rate</th>
      <th>Failures</th>
      <th>Avg Duration</th>
    </tr>
  </thead>
  <tbody>
${rows}
  </tbody>
</table>`
}

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
