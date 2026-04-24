export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low' | 'informational'

export interface Finding {
  id: string
  severity: FindingSeverity
  name: string
  cve_id: string | null
  repo: string
  file: string | null
  line: number | null
  cvss_score: number | null
  status: 'open' | 'mitigated' | 'false_positive'
  description: string | null
  created_at: string
}

export interface Repository {
  id: string
  nickname: string
  uri: string
  source_control: string
  scan_status: 'idle' | 'scanning' | 'completed' | 'failed'
}

export interface Remediation {
  id: string
  finding_id: string
  diff: string | null
  status: 'pending' | 'ready' | 'applied'
  auto_create: boolean
}

export interface PR {
  remediation_id: string
  url: string
  status: string
}

export interface ApiToken {
  id: string
  name: string
  token: string
  created_at: string
}

export interface SessionUser {
  id: string
  email: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

export type Panel = 'findings' | 'repos' | 'chat'

export type InputMode = 'navigation' | 'repl' | 'chat' | 'login'
