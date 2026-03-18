export interface AlertOverride {
  agentId: string
  taskType: string
  successRateFloor: number
}

export interface AlertConfig {
  channel: string
  schedule: string
  windowHours: number
  minJobs: number
  successRateFloor: number
  overrides?: AlertOverride[]
}

export interface AlertResult {
  agentId: string
  taskType: string
  successRate: number
  threshold: number
  jobCount: number
  isDegraded: boolean
}
