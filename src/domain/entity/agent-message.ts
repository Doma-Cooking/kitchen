export interface AgentMessage {
  category: 'assistant' | 'result'
  type: 'text' | 'tool_use' | 'success' | 'error'
  content: string
}
