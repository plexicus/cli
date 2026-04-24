import type { ChatMessage } from '../../types.js'
import type { Config } from '../config.js'
import { streamClaude } from './claude.js'
import { streamOpenAI } from './openai.js'
import { LLMError } from '../../utils/errors.js'

export interface LLMStreamOptions {
  messages: ChatMessage[]
  systemPrompt: string
  config: Config
  onChunk: (chunk: string) => void
  signal: AbortSignal
}

export async function streamLLM({
  messages,
  systemPrompt,
  config,
  onChunk,
  signal,
}: LLMStreamOptions): Promise<void> {
  const { provider, apiKey, model, baseUrl } = config.llm

  if (!provider) throw new LLMError('No LLM provider configured. Run: plexicus config set llm.provider claude', 'unknown')
  if (!apiKey) throw new LLMError('No LLM API key configured. Run: plexicus config set llm.api_key <key>', provider)

  if (provider === 'claude') {
    await streamClaude(messages, systemPrompt, apiKey, model, onChunk, signal)
  } else {
    await streamOpenAI(messages, systemPrompt, apiKey, model, baseUrl, onChunk, signal)
  }
}
