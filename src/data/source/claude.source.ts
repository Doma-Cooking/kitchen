import { query } from '@anthropic-ai/claude-agent-sdk'
import type { AgentMessage } from '../../domain/entity/agent-message.ts'

export class ClaudeSource {
  async invokeAgent(
    prompt: string,
    pluginPaths: string[],
    agentPrompt: string,
    onMessage: (msg: AgentMessage) => void,
    env?: Record<string, string>,
    sessionId?: string,
    maxTurns?: number,
    cwd?: string,
  ): Promise<{ result: string; sessionId: string }> {
    const baseOptions = {
      systemPrompt: { type: 'preset' as const, preset: 'claude_code' as const, append: agentPrompt },
      plugins: pluginPaths.map((path) => ({ type: 'local' as const, path })),
      permissionMode: 'bypassPermissions' as const,
      allowDangerouslySkipPermissions: true,
      maxTurns: maxTurns ?? 50,
      env: { ...process.env, ...env },
      ...(cwd ? { cwd } : {}),
    }

    try {
      return await this.executeQuery(prompt, { ...baseOptions, ...(sessionId ? { resume: sessionId } : {}) }, onMessage)
    } catch (error) {
      if (!sessionId) throw error
      console.warn(`Failed to resume session ${sessionId}, starting fresh`)
      return await this.executeQuery(prompt, baseOptions, onMessage)
    }
  }

  private async executeQuery(
    prompt: string,
    options: Parameters<typeof query>[0]['options'],
    onMessage: (msg: AgentMessage) => void,
  ): Promise<{ result: string; sessionId: string }> {
    const messages = query({ prompt, options })

    let result = ''
    let resolvedSessionId = ''
    for await (const msg of messages) {
      if (msg.session_id) {
        resolvedSessionId = msg.session_id
      }

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
          const content = isSuccess
            ? msg.result
            : msg.errors.length ? `${msg.subtype}: ${msg.errors.join('\n')}` : msg.subtype
          onMessage({ category: 'result', type: isSuccess ? 'success' : 'error', content })
          if (msg.subtype === 'success') {
            result = msg.result
          }
          break
        }
      }
    }
    return { result, sessionId: resolvedSessionId }
  }
}
