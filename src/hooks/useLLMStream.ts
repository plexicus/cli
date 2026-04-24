import { useRef, useCallback, useEffect } from 'react'
import { useAppState } from '../state/AppState.js'
import { streamLLM } from '../services/llm/index.js'
import { buildFindingsSystemPrompt } from '../services/llm/contextBuilder.js'
import { loadConfig } from '../services/config.js'

export function useLLMStream() {
  const { state, dispatch } = useAppState()
  const controllerRef = useRef<AbortController | null>(null)

  // Abort the stream when the hook's owner unmounts
  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort()
        controllerRef.current = null
      }
    }
  }, [])

  const abort = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort()
      controllerRef.current = null
    }
    dispatch({ type: 'chat/done' })
  }, [dispatch])

  const send = useCallback(async (userMessage: string) => {
    if (state.chatStreaming) abort()

    // Add user message
    dispatch({ type: 'chat/append', payload: { role: 'user', content: userMessage } })
    // Add empty assistant message that will be filled by streaming
    const assistantMessageIndex = state.chatMessages.length + 1 // +1 for the user message we just added
    dispatch({ type: 'chat/append', payload: { role: 'assistant', content: '', streaming: true } })
    dispatch({ type: 'chat/streaming', payload: true })

    const controller = new AbortController()
    controllerRef.current = controller

    try {
      const config = await loadConfig()
      const systemPrompt = buildFindingsSystemPrompt(state.findings)

      await streamLLM({
        messages: [...state.chatMessages, { role: 'user', content: userMessage }],
        systemPrompt,
        config,
        signal: controller.signal,
        onChunk: (chunk) => {
          dispatch({
            type: 'chat/chunk',
            payload: { messageIndex: assistantMessageIndex, chunk },
          })
        },
      })
    } catch (err) {
      if (controller.signal.aborted) return
      const errorMsg = err instanceof Error ? err.message : 'LLM request failed'
      dispatch({
        type: 'chat/chunk',
        payload: { messageIndex: assistantMessageIndex, chunk: `\n\n[Error: ${errorMsg}]` },
      })
    } finally {
      controllerRef.current = null
      dispatch({ type: 'chat/done' })
    }
  }, [state.chatStreaming, state.chatMessages, state.findings, abort, dispatch])

  return { send, abort }
}
