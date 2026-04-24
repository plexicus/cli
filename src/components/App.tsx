import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Box, Text, useInput, useApp } from 'ink'
import { AppStateProvider, useAppState } from '../state/AppState.js'
import { KeybindingsHelp } from './design-system/KeybindingsHelp.js'
import { FindingsPanel } from './FindingsPanel.js'
import { ReposPanel } from './ReposPanel.js'
import { ChatSidebar } from './ChatSidebar.js'
import { DetailPane } from './DetailPane.js'
import { DiffView } from './DiffView.js'
import { FilterModal } from './FilterModal.js'
import { LoginForm } from './LoginForm.js'
import { FirstRunWizard } from './FirstRunWizard.js'
import { findCommand } from '../commands.js'
import type { Config } from '../services/config.js'
import type { Panel } from '../types.js'

interface AppProps {
  repo?: string
  cve?: string
  token?: string
  config?: Config
  initialPanel?: Panel
}

function AuthGate({
  token,
  config,
  children,
}: {
  token?: string
  config?: Config
  children: React.ReactNode
}) {
  const { state } = useAppState()
  const [needsFirstRun, setNeedsFirstRun] = useState(
    !config?.serverUrl || config.serverUrl === '',
  )

  if (needsFirstRun) {
    return <FirstRunWizard onComplete={() => setNeedsFirstRun(false)} />
  }

  if (!state.isAuthenticated) {
    return (
      <LoginForm prefilledToken={token ?? process.env.PLEXICUS_TOKEN} />
    )
  }

  return <>{children}</>
}

function AppShell(props: AppProps) {
  const { state, dispatch } = useAppState()
  const { exit } = useApp()
  const [replInput, setReplInput] = useState('')
  const [replOutput, setReplOutput] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [showDiffView, setShowDiffView] = useState(false)
  const [activeFindingForDiff, setActiveFindingForDiff] = useState<
    string | null
  >(null)
  const commandHistory = useRef<string[]>([])
  const historyIndex = useRef(-1)
  // Always-current refs — avoid stale closures in useInput and useCallback
  const replInputRef = useRef('')
  replInputRef.current = replInput
  const stateRef = useRef(state)
  stateRef.current = state

  // Set initial panel from props on mount
  useEffect(() => {
    if (props.initialPanel && props.initialPanel !== state.activePanel) {
      dispatch({ type: 'ui/setPanel', payload: props.initialPanel })
    }
  }, []) // run once on mount only

  // Global key handler (navigation mode only for most keys)
  useInput((input, key) => {
    if (showHelp) {
      setShowHelp(false)
      return
    }

    // Filter modal captures all its own keys via its own useInput
    if (state.inputMode === 'filter') return

    // ? opens help in navigation and chat modes; in repl mode it is typeable via char capture
    if (input === '?' && (state.inputMode === 'navigation' || state.inputMode === 'chat')) {
      setShowHelp(true)
      return
    }

    if (state.inputMode === 'navigation') {
      if (input === 'F') {
        dispatch({ type: 'filter/open' })
        return
      }
      if (input === '/') {
        dispatch({ type: 'ui/setFuzzyOpen', payload: true })
        return
      }
      if (input === ':') {
        setReplInput('')
        dispatch({ type: 'ui/setInputMode', payload: 'repl' })
        return
      }
      if (input === 'c') {
        dispatch({ type: 'chat/toggle' })
        dispatch({
          type: 'ui/setInputMode',
          payload: state.chatVisible ? 'navigation' : 'chat',
        })
        return
      }
      if (input === '1') {
        dispatch({ type: 'ui/setPanel', payload: 'findings' })
        return
      }
      if (input === '2') {
        dispatch({ type: 'ui/setPanel', payload: 'repos' })
        return
      }
      if (key.tab) {
        const next = state.activePanel === 'findings' ? 'repos' : 'findings'
        dispatch({ type: 'ui/setPanel', payload: next })
        return
      }
      if (key.ctrl && input === 'c') {
        exit()
        return
      }
    }

    if (state.inputMode === 'repl' && !state.fuzzyOpen) {
      if (key.escape) {
        setReplInput('')
        setReplOutput(null)
        dispatch({ type: 'ui/setInputMode', payload: 'navigation' })
        return
      }
      if (key.upArrow) {
        const h = commandHistory.current
        if (h.length > 0) {
          const newIdx = Math.min(historyIndex.current + 1, h.length - 1)
          historyIndex.current = newIdx
          setReplInput(h[h.length - 1 - newIdx])
        }
        return
      }
      if (key.downArrow) {
        const newIdx = Math.max(historyIndex.current - 1, -1)
        historyIndex.current = newIdx
        setReplInput(
          newIdx === -1
            ? ''
            : commandHistory.current[commandHistory.current.length - 1 - newIdx],
        )
        return
      }
      if (key.backspace || key.delete) {
        setReplInput(prev => prev.slice(0, -1))
        return
      }
      if (key.return) {
        const current = replInputRef.current
        setReplInput('')
        handleReplSubmit(current)
        return
      }
      // Capture printable characters directly (bypasses TextInput focus issues)
      if (!key.ctrl && !key.meta && input && input.length === 1) {
        setReplInput(prev => prev + input)
        return
      }
    }
  })

  const handleReplSubmit = useCallback(
    async (value: string) => {
      const trimmed = value.trim()
      if (!trimmed) {
        dispatch({ type: 'ui/setInputMode', payload: 'navigation' })
        return
      }

      commandHistory.current = [...commandHistory.current.slice(-19), trimmed]
      historyIndex.current = -1
      setReplInput('')

      // Parse command
      const parts = trimmed.startsWith('/')
        ? trimmed.slice(1).split(/\s+/)
        : trimmed.split(/\s+/)
      const cmdName = parts[0]
      const args = parts.slice(1)

      try {
        if (cmdName === 'ask' || cmdName === 'a') {
          if (args.length === 0) {
            setReplOutput('Usage: /ask <question>')
            dispatch({ type: 'ui/setInputMode', payload: 'navigation' })
            return
          }
          if (!state.chatVisible) {
            dispatch({ type: 'chat/toggle' })
          }
          dispatch({ type: 'ui/setInputMode', payload: 'chat' })
          dispatch({ type: 'chat/setPending', payload: args.join(' ') })
          setReplOutput(null)
          return
        }

        if (cmdName === 'theme') {
          const theme = args[0] as 'dark' | 'light'
          if (theme === 'dark' || theme === 'light') {
            dispatch({ type: 'ui/setTheme', payload: theme })
            setReplOutput(`Theme set to ${theme}`)
          } else {
            setReplOutput('Usage: /theme <dark|light>')
          }
          dispatch({ type: 'ui/setInputMode', payload: 'navigation' })
          return
        }

        if (cmdName === 'filter') {
          const filter: { severities?: Array<'critical' | 'high' | 'medium' | 'low' | 'informational'> } = {}
          for (const arg of args) {
            const [k, v] = arg.split(':')
            if ((k === 'severity' || k === 'severities') && v) {
              filter.severities = v.split(',') as typeof filter.severities
            }
          }
          dispatch({ type: 'findings/filter', payload: filter })
          setReplOutput(`Filter applied`)
          dispatch({ type: 'ui/setInputMode', payload: 'navigation' })
          return
        }

        if (cmdName === '?' || cmdName === 'help') {
          dispatch({ type: 'ui/setInputMode', payload: 'navigation' })
          setShowHelp(true)
          return
        }

        // Fallback: route through the command registry
        const cmd = await findCommand(cmdName)
        if (cmd && cmd.type === 'local') {
          const result = await cmd.call(args, { state: stateRef.current, dispatch })
          if (result) setReplOutput(result)
          dispatch({ type: 'ui/setInputMode', payload: 'navigation' })
          return
        }

        setReplOutput(`Unknown command: /${cmdName}`)
        dispatch({ type: 'ui/setInputMode', payload: 'navigation' })
      } catch (err) {
        setReplOutput(err instanceof Error ? err.message : 'Command failed')
        dispatch({ type: 'ui/setInputMode', payload: 'navigation' })
      }
    },
    [dispatch, setShowHelp],
  )

  const borderColor = state.theme === 'dark' ? 'cyan' : 'blue'

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box borderStyle="single" borderColor={borderColor} paddingX={1}>
        <Text bold color="cyan">
          plexicus
        </Text>
        <Text> </Text>
        <Text dimColor>v0.1.0</Text>
        {state.user && (
          <>
            <Text dimColor> | </Text>
            <Text color="green">{state.user.email}</Text>
          </>
        )}
        {state.error && (
          <>
            <Text dimColor> | </Text>
            <Text color="red">{state.error}</Text>
          </>
        )}
        {state.filterOpen && (
          <>
            <Text dimColor> | </Text>
            <Text color="cyan">FILTER</Text>
          </>
        )}
      </Box>

      {/* Main content area */}
      <Box flexDirection="row" flexGrow={1}>
        {/* Left: panel + detail */}
        <Box flexGrow={1} flexDirection="column">
          {state.activePanel === 'findings' ? (
            <FindingsPanel repo={props.repo} cve={props.cve} />
          ) : (
            <ReposPanel />
          )}
          {state.selectedFindingId && !showDiffView && (
            <DetailPane
              onRemediate={(f) => {
                setActiveFindingForDiff(f.id)
                setShowDiffView(true)
              }}
              onPR={(finding) => {
                setActiveFindingForDiff(finding.id)
                setShowDiffView(true)
              }}
              onSuppress={() => {}}
              onFalsePositive={() => {}}
            />
          )}
          {showDiffView &&
            activeFindingForDiff &&
            (() => {
              const finding = state.findings.find(
                (f) => f.id === activeFindingForDiff,
              )
              return finding ? (
                <DiffView
                  finding={finding}
                  onClose={() => setShowDiffView(false)}
                />
              ) : null
            })()}
        </Box>

        {/* Right: chat sidebar */}
        <ChatSidebar helpOpen={showHelp} />
      </Box>

      {/* Filter modal */}
      {state.filterOpen && <FilterModal />}

      {/* REPL output */}
      {replOutput && (
        <Box paddingX={1}>
          <Text color="yellow">{replOutput}</Text>
        </Box>
      )}

      {/* REPL input bar — uses direct useInput capture, no TextInput focus dependency */}
      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color="cyan">&gt; </Text>
        {state.inputMode === 'repl' && !state.fuzzyOpen ? (
          replInput
            ? <Text>{replInput}<Text inverse> </Text></Text>
            : <Text dimColor>Type a command... (/ask, /filter, /theme)<Text inverse> </Text></Text>
        ) : (
          <Text dimColor>{replInput || 'Press : for commands, / to search, F to filter'}</Text>
        )}
      </Box>

      {/* Keybindings help overlay */}
      {showHelp && <KeybindingsHelp onDismiss={() => setShowHelp(false)} />}
    </Box>
  )
}

export default function App(props: AppProps) {
  const initialTheme = props.config?.theme ?? 'dark'
  return (
    <AppStateProvider initialTheme={initialTheme}>
      <AuthGate token={props.token} config={props.config}>
        <AppShell {...props} />
      </AuthGate>
    </AppStateProvider>
  )
}
