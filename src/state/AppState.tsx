import React, { createContext, useContext, useReducer, type ReactNode } from 'react'
import type { Finding, Repository, Remediation, ChatMessage, Panel, InputMode, SessionUser } from '../types.js'
import type { Action, FindingsFilter } from './actions.js'

export interface AppState {
  isAuthenticated: boolean
  user: SessionUser | null
  token: string | null
  findings: Finding[]
  selectedFindingId: string | null
  findingsLoading: boolean
  findingsFilter: FindingsFilter
  findingsPage: number
  findingsTotal: number
  findingsPageCount: number
  repos: Repository[]
  reposLoading: boolean
  remediations: Record<string, Remediation>
  chatMessages: ChatMessage[]
  chatStreaming: boolean
  chatVisible: boolean
  activePanel: Panel
  inputMode: InputMode
  fuzzyOpen: boolean
  filterOpen: boolean
  theme: 'dark' | 'light'
  error: string | null
  pendingChatMessage: string | null
}

const initialState: AppState = {
  isAuthenticated: false,
  user: null,
  token: null,
  findings: [],
  selectedFindingId: null,
  findingsLoading: false,
  findingsFilter: { severities: ['critical', 'high'] },
  findingsPage: 0,
  findingsTotal: 0,
  findingsPageCount: 1,
  repos: [],
  reposLoading: false,
  remediations: {},
  chatMessages: [],
  chatStreaming: false,
  chatVisible: false,
  activePanel: 'findings',
  inputMode: 'navigation',
  fuzzyOpen: false,
  filterOpen: false,
  theme: 'dark',
  error: null,
  pendingChatMessage: null,
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'auth/set':
      return { ...state, isAuthenticated: true, user: action.payload.user, token: action.payload.token, error: null }

    case 'auth/clear':
      return { ...state, isAuthenticated: false, user: null, token: null }

    case 'findings/set':
      return { ...state, findings: action.payload, findingsLoading: false }

    case 'findings/loading':
      return { ...state, findingsLoading: action.payload }

    case 'findings/select':
      return { ...state, selectedFindingId: action.payload }

    case 'findings/filter':
      return { ...state, findingsFilter: action.payload, findingsPage: 0 }

    case 'findings/update': {
      const updated = state.findings.map(f => f.id === action.payload.id ? action.payload : f)
      return { ...state, findings: updated }
    }

    case 'findings/setPage':
      return { ...state, findingsPage: action.payload }

    case 'findings/setPagination':
      return { ...state, findingsTotal: action.payload.total, findingsPageCount: action.payload.pageCount }

    case 'repos/set':
      return { ...state, repos: action.payload, reposLoading: false }

    case 'repos/loading':
      return { ...state, reposLoading: action.payload }

    case 'remediation/set':
      return {
        ...state,
        remediations: { ...state.remediations, [action.payload.finding_id]: action.payload },
      }

    case 'chat/append':
      return { ...state, chatMessages: [...state.chatMessages, action.payload] }

    case 'chat/streaming':
      return { ...state, chatStreaming: action.payload }

    case 'chat/toggle':
      return { ...state, chatVisible: !state.chatVisible }

    case 'chat/chunk': {
      const { messageIndex, chunk } = action.payload
      const msgs = state.chatMessages.map((m, i) =>
        i === messageIndex ? { ...m, content: m.content + chunk } : m
      )
      return { ...state, chatMessages: msgs }
    }

    case 'chat/done':
      return {
        ...state,
        chatStreaming: false,
        chatMessages: state.chatMessages.map(m => ({ ...m, streaming: false })),
      }

    case 'chat/clear':
      return { ...state, chatMessages: [] }

    case 'chat/setPending':
      return { ...state, pendingChatMessage: action.payload }

    case 'ui/setPanel':
      return { ...state, activePanel: action.payload }

    case 'ui/setTheme':
      return { ...state, theme: action.payload }

    case 'ui/setError':
      return { ...state, error: action.payload }

    case 'ui/setInputMode':
      return { ...state, inputMode: action.payload }

    case 'ui/setFuzzyOpen':
      return { ...state, fuzzyOpen: action.payload, inputMode: action.payload ? 'repl' : 'navigation' }

    case 'filter/open':
      return { ...state, filterOpen: true, inputMode: 'filter' }

    case 'filter/close':
      return { ...state, filterOpen: false, inputMode: 'navigation' }

    default:
      return state
  }
}

interface AppStateContextValue {
  state: AppState
  dispatch: React.Dispatch<Action>
}

const AppStateContext = createContext<AppStateContextValue | null>(null)

interface AppStateProviderProps {
  children: ReactNode
  initialTheme?: 'dark' | 'light'
}

export function AppStateProvider({ children, initialTheme = 'dark' }: AppStateProviderProps) {
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    theme: initialTheme,
  })

  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      {children}
    </AppStateContext.Provider>
  )
}

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider')
  return ctx
}
