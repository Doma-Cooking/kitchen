import { WebClient } from '@slack/web-api'
import type { ConfigRepository } from '../repository/config.repository.js'

export class SlackSource {
  private client: WebClient | undefined

  constructor(private readonly configRepository: ConfigRepository) {}

  private getClient(): WebClient {
    if (!this.client) {
      const token = this.configRepository.getConfig().defaultSlackBotToken
      if (!token) throw new Error('No default Slack bot token configured')
      this.client = new WebClient(token)
    }
    return this.client
  }

  async postMessage(channel: string, text: string): Promise<void> {
    await this.getClient().chat.postMessage({ channel, text })
  }
}
