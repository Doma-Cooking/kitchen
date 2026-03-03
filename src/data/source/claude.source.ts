import { query } from '@anthropic-ai/claude-agent-sdk'
import type { AgentMessage } from '../../domain/entity/agent-message.ts'

export class ClaudeSource {
  async invokeAgent(
    prompt: string,
    pluginPaths: string[],
    onMessage: (msg: AgentMessage) => void,
    env?: Record<string, string>,
  ): Promise<string> {
    const messages = query({
      prompt,
      options: {
        systemPrompt: { type: 'preset', preset: 'claude_code' },
        plugins: pluginPaths.map((path) => ({ type: 'local' as const, path })),
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        maxTurns: 10,
        env: { ...process.env, ...env },
      },
    })

    let result = ''
    for await (const msg of messages) {
      switch (msg.type) {
        case 'assistant': {
          for (const block of msg.message.content) {
            if (block.type === 'text') {
              onMessage({ category: 'assistant', type: 'text', content: block.text })
            } else if (block.type === 'tool_use') {
              onMessage({ category: 'assistant', type: 'tool_use', content: `${block.name}(${JSON.stringify(block.input)})` })
            }
          }
          break
        }
        case 'result': {
          const isSuccess = msg.subtype === 'success'
          const content = isSuccess ? msg.result : msg.errors.join('\n')
          onMessage({ category: 'result', type: isSuccess ? 'success' : 'error', content })
          if (msg.subtype === 'success') {
            result = msg.result
          }
          break
        }
      }
    }
    return result
  }
}
