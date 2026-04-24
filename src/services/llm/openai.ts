import OpenAI from 'openai'
import type { ChatMessage } from '../../types.js'
import { LLMError } from '../../utils/errors.js'

export async function streamOpenAI(
  messages: ChatMessage[],
  systemPrompt: string,
  apiKey: string,
  model: string | undefined = 'gpt-4o',
  baseUrl: string | undefined,
  onChunk: (chunk: string) => void,
  signal: AbortSignal,
): Promise<void> {
  const client = new OpenAI({ apiKey, baseURL: baseUrl })

  const apiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...messages
      .filter(m => !m.streaming)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ]

  try {
    const stream = await client.chat.completions.create({
      model: model ?? 'gpt-4o',
      messages: apiMessages,
      stream: true,
    }, { signal })

    for await (const chunk of stream) {
      if (signal.aborted) break
      const text = chunk.choices[0]?.delta?.content ?? ''
      if (text) onChunk(text)
    }
  } catch (err) {
    if (signal.aborted || (err instanceof Error && err.name === 'AbortError')) return
    throw new LLMError(
      err instanceof Error ? err.message : 'OpenAI streaming failed',
      'openai',
    )
  }
}
