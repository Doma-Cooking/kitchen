export interface SlackMessage {
  user: string
  text: string
  ts?: string
}

export type ApiTrigger = { type: 'api' }
export type SlackTrigger = { type: 'slack'; channelId: string; threadTs?: string; messageTs?: string; userId: string; recentMessages?: SlackMessage[] }
export type AgentTrigger = { type: 'agent'; data: Record<string, unknown> }
export type EventTrigger = ApiTrigger | SlackTrigger | AgentTrigger

export function triggerToString(trigger: EventTrigger): string {
  switch (trigger.type) {
    case 'slack': {
      const { channelId, threadTs, messageTs, userId, recentMessages } = trigger
      const meta = `[Source: slack | channel: ${channelId} | thread_ts: ${threadTs ?? 'none'} | message_ts: ${messageTs ?? 'none'} | user: ${userId}]`

      if (!recentMessages || recentMessages.length === 0) return meta

      const history = recentMessages
        .map((m) => `  ${m.ts ? `[ts:${m.ts}] ` : ''}${m.user}: ${m.text}`)
        .join('\n')

      return `${meta}\n[Recent messages]\n${history}`
    }
    case 'agent':
      return `[Source: agent | data: ${JSON.stringify(trigger.data)}]`
    default:
      return ''
  }
}
