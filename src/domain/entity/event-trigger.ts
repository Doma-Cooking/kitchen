export type ApiTrigger = { type: 'api' }
export type SlackTrigger = { type: 'slack'; channelId: string; threadTs?: string; userId: string }
export type EventTrigger = ApiTrigger | SlackTrigger
