export interface SlackMessage {
  user: string
  text: string
  ts?: string
}

export interface SlackAttachment {
  id: string
  name: string
  mimetype: string
  url: string
}

export type ApiTrigger = { type: 'api' }
export type SlackTrigger = { type: 'slack'; channelId: string; threadTs?: string; messageTs?: string; userId: string; recentMessages?: SlackMessage[]; attachments?: SlackAttachment[] }
export type AgentTrigger = { type: 'agent'; data: Record<string, unknown> }
export type CronTrigger = { type: 'cron'; cron: string; scheduleName?: string }
export type EventTrigger = ApiTrigger | SlackTrigger | AgentTrigger | CronTrigger

export function triggerToString(trigger: EventTrigger): string {
  switch (trigger.type) {
    case 'slack': {
      const { channelId, threadTs, messageTs, userId, recentMessages, attachments } = trigger
      const meta = `[Source: slack | channel: ${channelId} | thread_ts: ${threadTs ?? 'none'} | message_ts: ${messageTs ?? 'none'} | user: ${userId}]`

      const parts: string[] = [meta]

      if (recentMessages && recentMessages.length > 0) {
        const history = recentMessages.map((m) => `  ${m.ts ? `[ts:${m.ts}] ` : ''}${m.user}: ${m.text}`).join('\n')
        parts.push(`[Recent messages]\n${history}`)
      }

      if (attachments && attachments.length > 0) {
        const list = attachments.map((a) => `  ${a.name} (${a.mimetype}): ${a.url}`).join('\n')
        parts.push(`[Attachments]\n${list}`)
      }

      return parts.join('\n')
    }
    case 'agent':
      return `[Source: agent | data: ${JSON.stringify(trigger.data)}]`
    case 'cron':
      return `[Source: cron | expression: ${trigger.cron}${trigger.scheduleName ? ` | name: ${trigger.scheduleName}` : ''}]`
    default:
      return ''
  }
}
