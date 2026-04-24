import type { Finding, FindingSeverity, FindingStatus, FindingType, Repository, Remediation, ChatMessage, Panel, InputMode, SessionUser } from '../types.js'

export interface FindingsFilter {
  severities?: FindingSeverity[]
  repository_ids?: string[]
  statuses?: FindingStatus[]
  types?: FindingType[]
  cvss_gt?: number
  cvss_lt?: number
  priority_gt?: number
  priority_lt?: number
  cwe_ids?: number[]
  policy_names?: string[]
  languages?: string[]
  categories?: string[]
  is_false_positive?: boolean
  finding_type?: 'app' | 'scm' | 'cloud' | 'registry'
}

export type Action =
  | { type: 'auth/set'; payload: { user: SessionUser; token: string } }
  | { type: 'auth/clear' }
  | { type: 'findings/set'; payload: Finding[] }
  | { type: 'findings/loading'; payload: boolean }
  | { type: 'findings/select'; payload: string | null }
  | { type: 'findings/filter'; payload: FindingsFilter }
  | { type: 'findings/update'; payload: Finding }
  | { type: 'findings/setPage'; payload: number }
  | { type: 'findings/setPagination'; payload: { total: number; pageCount: number } }
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
  | { type: 'filter/open' }
  | { type: 'filter/close' }
