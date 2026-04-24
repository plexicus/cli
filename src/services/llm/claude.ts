import Anthropic from '@anthropic-ai/sdk'
import type { ChatMessage } from '../../types.js'
import { LLMError } from '../../utils/errors.js'

export async function streamClaude(
  messages: ChatMessage[],
  systemPrompt: string,
  apiKey: string,
  model: string | undefined = 'claude-sonnet-4-6',
  onChunk: (chunk: string) => void,
  signal: AbortSignal,
): Promise<void> {
  const client = new Anthropic({ apiKey })

  const apiMessages = messages
    .filter(m => !m.streaming)
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  try {
    const stream = await client.messages.stream({
      model: model ?? 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages: apiMessages,
    })

    for await (const event of stream) {
      if (signal.aborted) break
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        onChunk(event.delta.text)
      }
    }
  } catch (err) {
    if (signal.aborted || (err instanceof Error && err.name === 'AbortError')) return
    throw new LLMError(
      err instanceof Error ? err.message : 'Claude streaming failed',
      'claude',
    )
  }
}
