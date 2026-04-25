import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Box, Text, useInput } from 'ink'
import TextInput from 'ink-text-input'
import { useAppState } from '../state/AppState.js'
import { accent } from '../utils/theme.js'
import { useLLMStream } from '../hooks/useLLMStream.js'
import { Spinner } from './design-system/Spinner.js'

export function AIModal() {
  const { state, dispatch } = useAppState()
  const ac = accent(state.theme)
  const { send, abort } = useLLMStream()
  const [input, setInput] = useState('')
  const sentInitialRef = useRef(false)

  // Send the initial prompt that triggered the modal (from smart REPL)
  useEffect(() => {
    if (!sentInitialRef.current && state.aiModalPrompt) {
      sentInitialRef.current = true
      send(state.aiModalPrompt)
    }
  }, [])

  useEffect(() => {
    return () => abort()
  }, [])

  useInput((inputChar, key) => {
    if (state.inputMode !== 'chat') return
    if (key.escape) {
      abort()
      dispatch({ type: 'ai/close' })
      dispatch({ type: 'ui/setInputMode', payload: 'navigation' })
    }
  })

  const handleSubmit = useCallback(async (value: string) => {
    const trimmed = value.trim()
    if (!trimmed || state.chatStreaming) return
    setInput('')
    await send(trimmed)
  }, [send, state.chatStreaming])

  if (!state.aiModalOpen) return null

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={ac}
      paddingX={1}
    >
      <Box>
        <Text bold color={ac}>AI Assistant</Text>
        {state.chatStreaming && (
          <>
            <Text> </Text>
            <Spinner interval={80} />
          </>
        )}
        <Text dimColor>  [Esc]close</Text>
      </Box>

      <Box flexDirection="column" paddingX={1}>
        {state.chatMessages.length === 0 && (
          <Text dimColor>Ask anything about your security findings...</Text>
        )}
        {state.chatMessages.map((msg, i) => (
          <Box key={i} flexDirection="column" marginTop={1}>
            <Text bold color={msg.role === 'user' ? 'cyan' : 'magenta'}>
              {msg.role === 'user' ? 'You:' : 'AI:'}
            </Text>
            <Text wrap="wrap">
              {msg.content}
              {msg.streaming && <Text color={ac}>█</Text>}
            </Text>
          </Box>
        ))}
      </Box>

      <Box paddingX={1} borderStyle="single" borderColor="gray">
        <Text dimColor>[AI] </Text>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder="Ask about your security findings..."
          focus={state.inputMode === 'chat'}
        />
      </Box>
    </Box>
  )
}
