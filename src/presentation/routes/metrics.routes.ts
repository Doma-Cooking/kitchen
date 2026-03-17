import { Hono, type Context } from 'hono'
import { ADMIN_BASE_PATH, DASHBOARD_BASE_PATH } from './dashboard.routes.js'
import type { LogRepository } from '../../data/repository/log.repository.js'
import type { TaskMetric } from '../../domain/entity/task-log.js'

export const METRICS_BASE_PATH = `${ADMIN_BASE_PATH}/metrics`

const RANGES: Record<string, { label: string; hours: number }> = {
  '24h': { label: 'Last 24 hours', hours: 24 },
  '7d': { label: 'Last 7 days', hours: 168 },
  '30d': { label: 'Last 30 days', hours: 720 },
}

export class MetricsRoutes {
  readonly router: Hono

  constructor(private readonly logRepository: LogRepository) {
    this.router = new Hono()
    this.router.get(METRICS_BASE_PATH, (c) => this.fullPage(c))
    this.router.get(`${METRICS_BASE_PATH}/table`, (c) => this.tableFragment(c))
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

function renderPage(metrics: TaskMetric[], selectedRange: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kitchen — Metrics</title>
  <script src="https://unpkg.com/htmx.org@2.0.4/dist/htmx.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; font-size: 14px; background: #f5f5f5; color: #111; }
    header { background: #111; color: #fff; padding: 12px 24px; display: flex; align-items: center; gap: 24px; }
    header a { color: #aaa; text-decoration: none; font-size: 13px; }
    header a:hover { color: #fff; }
    h1 { font-size: 16px; font-weight: 600; }
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
  <header>
    <h1>Kitchen Admin</h1>
    <a href="${DASHBOARD_BASE_PATH}">Queue Inspector</a>
    <a href="${METRICS_BASE_PATH}">Metrics</a>
  </header>
  <main>
    <div class="toolbar">
      <label for="range">Time range</label>
      <select
        id="range"
        name="range"
        hx-get="${METRICS_BASE_PATH}/table"
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
