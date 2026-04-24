import type { Finding, FindingSeverity, Repository, Remediation, ChatMessage, Panel, InputMode, SessionUser } from '../types.js'

export type Action =
  | { type: 'auth/set'; payload: { user: SessionUser; token: string } }
  | { type: 'auth/clear' }
  | { type: 'findings/set'; payload: Finding[] }
  | { type: 'findings/loading'; payload: boolean }
  | { type: 'findings/select'; payload: string | null }
  | { type: 'findings/filter'; payload: { repo?: string; severities?: FindingSeverity[] } }
  | { type: 'findings/update'; payload: Finding }
  | { type: 'repos/set'; payload: Repository[] }
  | { type: 'repos/loading'; payload: boolean }
  | { type: 'remediation/set'; payload: Remediation }
  | { type: 'chat/append'; payload: ChatMessage }
  | { type: 'chat/streaming'; payload: boolean }
  | { type: 'chat/toggle' }
  | { type: 'chat/chunk'; payload: { messageIndex: number; chunk: string } }
  | { type: 'chat/done' }
  | { type: 'chat/clear' }
  | { type: 'ui/setPanel'; payload: Panel }
  | { type: 'ui/setTheme'; payload: 'dark' | 'light' }
  | { type: 'ui/setError'; payload: string | null }
  | { type: 'ui/setInputMode'; payload: InputMode }
  | { type: 'chat/setPending'; payload: string | null }
  | { type: 'ui/setFuzzyOpen'; payload: boolean }
