import React, { useState, useEffect, useCallback } from 'react'
import { Box, Text, useInput } from 'ink'
import TextInput from 'ink-text-input'
import { useAppState } from '../state/AppState.js'
import { useLLMStream } from '../hooks/useLLMStream.js'
import { Spinner } from './design-system/Spinner.js'

export function ChatSidebar({ helpOpen = false }: { helpOpen?: boolean }) {
  const { state, dispatch } = useAppState()
  const { send, abort } = useLLMStream()
  const [input, setInput] = useState('')

  // Abort stream on unmount
  useEffect(() => {
    return () => {
      abort()
    }
  }, []) // intentionally empty deps — abort ref is stable

  // Auto-send pending message set via /ask command
  useEffect(() => {
    if (state.pendingChatMessage && !state.chatStreaming) {
      const msg = state.pendingChatMessage
      dispatch({ type: 'chat/setPending', payload: null })
      send(msg)
    }
  }, [state.pendingChatMessage])

  // Retroactively clear '?' that leaked through before the help overlay re-render
  useEffect(() => {
    if (helpOpen && input.endsWith('?')) {
      setInput(prev => prev.slice(0, -1))
    }
  }, [helpOpen, input])

  useInput((inputChar, key) => {
    // While help overlay is open, block all input handling (prevent Escape from closing chat)
    if (helpOpen) return
    if (state.inputMode !== 'chat') return

    if (key.escape) {
      abort()
      dispatch({ type: 'chat/toggle' })
      dispatch({ type: 'ui/setInputMode', payload: 'navigation' })
      return
    }
  })

  const handleSubmit = useCallback(async (value: string) => {
    const trimmed = value.trim()
    if (!trimmed || state.chatStreaming) return
    setInput('')
    await send(trimmed)
  }, [send, state.chatStreaming])

  const handleFocus = useCallback(() => {
    dispatch({ type: 'ui/setInputMode', payload: 'chat' })
  }, [dispatch])

  if (!state.chatVisible) return null

  const messages = state.chatMessages

  return (
    <Box
      flexDirection="column"
      width={50}
      borderStyle="round"
      borderColor="magenta"
    >
      {/* Header */}
      <Box paddingX={1}>
        <Text bold color="magenta">AI Assistant</Text>
        {state.chatStreaming && (
          <>
            <Text> </Text>
            <Spinner interval={80} />
          </>
        )}
        <Text dimColor> [Esc]close</Text>
      </Box>

      {/* Messages */}
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        {messages.length === 0 && (
          <Text dimColor>Ask a security question about your findings...</Text>
        )}
        {messages.map((msg, i) => (
          <Box key={i} flexDirection="column" marginTop={1}>
            <Text bold color={msg.role === 'user' ? 'cyan' : 'magenta'}>
              {msg.role === 'user' ? 'You:' : 'AI:'}
            </Text>
            <Text wrap="wrap">
              {msg.content}
              {msg.streaming && <Text color="cyan">█</Text>}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Input */}
      <Box paddingX={1} borderStyle="single" borderColor="gray">
        <Text dimColor>[AI] </Text>
        <TextInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          placeholder="Ask about your security findings..."
          focus={state.inputMode === 'chat' && !helpOpen}
        />
      </Box>
    </Box>
  )
}
