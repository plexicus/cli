import type { Finding, Repository, Remediation, ApiToken, ApiTokenListItem, SessionUser, ScmRepo } from '../types.js'
import {
  FindingsResponseSchema, SingleFindingResponseSchema,
  RepositoriesResponseSchema,
  RemediationSchema, RemediationsCollectionSchema,
  ApiTokensListSchema, ApiTokenCreatedSchema,
  SessionUserSchema, LoginResponseUnion, LoginResponseFlatSchema,
  Verify2FAResponseSchema,
} from './apiSchemas.js'
import type { FindingsFilter } from '../state/actions.js'
import { PlexicusApiError, PlexicusAuthError } from '../utils/errors.js'

interface ApiConfig {
  baseUrl: string
  token?: string
}

export type LoginResult =
  | { kind: 'ok'; access_token: string; token_type: string }
  | { kind: '2fa'; secret: string }

interface FindingsResult {
  findings: Finding[]
  total: number
  pageCount: number
}

interface ReposResult {
  repos: Repository[]
  total: number
}

type EnvelopeMode = 'jsonapi' | 'wrapped' | 'raw' | 'auto'

function isWrapped(v: unknown): v is { success: boolean; data: unknown } {
  return (
    typeof v === 'object' &&
    v !== null &&
    'success' in v &&
    'data' in v &&
    typeof (v as { success: unknown }).success === 'boolean'
  )
}

function unwrapEnvelope(json: unknown, mode: EnvelopeMode): unknown {
  if (mode === 'raw' || mode === 'jsonapi') return json
  if (mode === 'wrapped') {
    if (isWrapped(json)) return (json as { data: unknown }).data
    throw new PlexicusApiError('expected wrapped envelope', 0, '')
  }
  if (isWrapped(json)) return (json as { data: unknown }).data
  return json
}

const MOCK_MODE = process.env.MOCK_PLEXICUS === '1'

async function loadFixture(name: string): Promise<unknown> {
  const { default: data } = await import(`../../tests/fixtures/plexicus/${name}.json`, {
    with: { type: 'json' },
  })
  return data
}

function buildFilterQuery(filter: FindingsFilter): URLSearchParams {
  const qs = new URLSearchParams()

  if (filter.severities?.length) {
    qs.set('filters[severity]', filter.severities.join(','))
  }
  if (filter.repository_ids?.length) {
    qs.set('filters[repository]', filter.repository_ids.join(','))
  }
  if (filter.statuses?.length) {
    qs.set('filters[status]', filter.statuses.join(','))
  }
  if (filter.types?.length) {
    qs.set('filters[type]', filter.types.join(','))
  }
  if (filter.cvss_gt !== undefined) {
    qs.set('filters[cvssv3_score_gt]', String(Math.floor(filter.cvss_gt)))
  }
  if (filter.cvss_lt !== undefined) {
    qs.set('filters[cvssv3_score_lt]', String(Math.floor(filter.cvss_lt)))
  }
  if (filter.priority_gt !== undefined) {
    qs.set('filters[priority_gt]', String(filter.priority_gt))
  }
  if (filter.priority_lt !== undefined) {
    qs.set('filters[priority_lt]', String(filter.priority_lt))
  }
  if (filter.cwe_ids?.length) {
    qs.set('filters[cwe]', filter.cwe_ids.join(','))
  }
  if (filter.policy_names?.length) {
    qs.set('filters[policy_name]', filter.policy_names.join(','))
  }
  if (filter.languages?.length) {
    qs.set('filters[language]', filter.languages.join(','))
  }
  if (filter.categories?.length) {
    qs.set('filters[category]', filter.categories.join(','))
  }
  if (filter.is_false_positive) {
    qs.set('filters[is_false_positive]', '1')
  }
  if (filter.finding_type) {
    qs.set('finding_type', filter.finding_type)
  }

  return qs
}

function parseFindings(raw: unknown, repoMap?: Map<string, string>): FindingsResult {
  const parsed = FindingsResponseSchema.parse(raw)
  const findings: Finding[] = parsed.data.map(item => ({
    id: item.id,
    repo_nickname: repoMap?.get(item.attributes.repo_id) ?? null,
    ...item.attributes,
  }))
  return {
    findings,
    total: parsed.meta?.pagination.total ?? findings.length,
    pageCount: parsed.meta?.pagination.pageCount ?? 1,
  }
}

function parseRepos(raw: unknown): ReposResult {
  const parsed = RepositoriesResponseSchema.parse(raw)
  const repos: Repository[] = parsed.data.map(item => ({
    id: item.id,
    nickname: item.attributes.nickname,
    uri: item.attributes.uri,
    active: item.attributes.active,
    repo_type: item.attributes.repo_type,
    status: item.attributes.status,
    source_control: item.attributes.data?.source_control ?? item.attributes.repo_type,
    repository_branch: item.attributes.data?.branch ?? 'main',
    finding_counts: item.attributes.findings ?? {
      total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0,
    },
  }))
  return {
    repos,
    total: parsed.meta?.pagination.total ?? repos.length,
  }
}

export class PlexicusApi {
  private baseUrl: string
  private token: string | undefined

  constructor({ baseUrl, token }: ApiConfig) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.token = token
  }

  setToken(token: string) {
    this.token = token
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`
    return headers
  }

  private async fetch<T>(
    method: string,
    path: string,
    body?: unknown,
    schema?: { parse: (v: unknown) => T },
    envelope: EnvelopeMode = 'auto',
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const res = await fetch(url, {
      method,
      headers: this.headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    if (res.status === 401) throw new PlexicusAuthError()
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new PlexicusApiError(`${method} ${path} failed: ${text}`, res.status, path)
    }
    const text = await res.text()
    if (!text) return undefined as T
    const json = JSON.parse(text)
    const unwrapped = unwrapEnvelope(json, envelope)
    return schema ? schema.parse(unwrapped) : (unwrapped as T)
  }

  async login(email: string, password: string): Promise<LoginResult> {
    if (MOCK_MODE) {
      const data = await loadFixture('login')
      const parsed = LoginResponseFlatSchema.parse(data)
      return { kind: 'ok', access_token: parsed.access_token, token_type: parsed.token_type }
    }
    const raw = await this.fetch<unknown>('POST', '/login', { email, password }, undefined, 'raw')
    const parsed = LoginResponseUnion.parse(raw)
    if ('requires_2fa' in parsed && parsed.requires_2fa) {
      return { kind: '2fa', secret: parsed.otp_data.secret }
    }
    const flat = parsed as { access_token: string; token_type: string }
    return { kind: 'ok', access_token: flat.access_token, token_type: flat.token_type }
  }

  async logout(): Promise<void> {
    if (MOCK_MODE) return
    await this.fetch<void>('POST', '/logout')
  }

  async getSession(): Promise<SessionUser> {
    if (MOCK_MODE) {
      const data = await loadFixture('session')
      return SessionUserSchema.parse(data)
    }
    return this.fetch<SessionUser>('GET', '/session', undefined, SessionUserSchema, 'raw')
  }

  async verify2FA(secret: string, otp_code: string): Promise<string> {
    if (MOCK_MODE) {
      const data = await loadFixture('login')
      const parsed = LoginResponseFlatSchema.parse(data)
      return parsed.access_token
    }
    const raw = await this.fetch<unknown>('POST', '/verify-session', { secret, otp_code }, undefined, 'raw')
    const parsed = Verify2FAResponseSchema.parse(raw)
    if (!parsed.verify_otp || !parsed.access_token) {
      throw new PlexicusAuthError()
    }
    return parsed.access_token!
  }

  async getFindings(
    filter: FindingsFilter = {},
    page = 0,
    repoMap?: Map<string, string>,
  ): Promise<FindingsResult> {
    if (MOCK_MODE) {
      const data = await loadFixture('findings')
      return parseFindings(data, repoMap)
    }
    const qs = buildFilterQuery(filter)
    qs.set('pagination_page', String(page))
    qs.set('pagination_pageSize', '25')
    qs.set('pagination_with_count', 'true')
    qs.set('pagination_active', 'true')
    const query = qs.toString() ? `?${qs}` : ''
    const raw = await this.fetch<unknown>('GET', `/findings${query}`, undefined, undefined, 'jsonapi')
    return parseFindings(raw, repoMap)
  }

  async getFinding(id: string): Promise<Finding> {
    if (MOCK_MODE) {
      const data = await loadFixture('finding-detail')
      const result = parseFindings(data)
      const found = result.findings.find(f => f.id === id)
      if (!found) throw new Error(`Finding ${id} not found in fixture`)
      return found
    }
    const raw = await this.fetch<unknown>('GET', `/findings/${id}`, undefined, undefined, 'jsonapi')
    const parsed = SingleFindingResponseSchema.parse(raw)
    return {
      id: parsed.data.id,
      repo_nickname: null,
      ...parsed.data.attributes,
    }
  }

  async markMitigated(id: string): Promise<void> {
    if (MOCK_MODE) return
    await this.fetch<void>('POST', `/findings/${id}/mark-as-mitigated`, undefined, undefined, 'raw')
  }

  async toggleFalsePositive(id: string): Promise<void> {
    if (MOCK_MODE) return
    await this.fetch<void>('PUT', `/findings/${id}/toggle_false_positive`, undefined, undefined, 'raw')
  }

  async createRemediation(findingId: string): Promise<void> {
    if (MOCK_MODE) return
    // POST returns 202; poll getRemediations or wait for WS event for actual state
    await this.fetch<void>('POST', '/remediations', { finding_id: findingId }, undefined, 'raw')
  }

  async getRemediations(findingId?: string): Promise<Remediation[]> {
    if (MOCK_MODE) {
      const data = await loadFixture('remediation')
      return RemediationsCollectionSchema.parse({ items: [data] }).items
    }
    const query = findingId ? `?finding_id=${findingId}` : ''
    const raw = await this.fetch<unknown>('GET', `/remediations${query}`, undefined, undefined, 'raw')
    return RemediationsCollectionSchema.parse(raw).items
  }

  async createPR(remediationId: string): Promise<void> {
    if (MOCK_MODE) return
    // PR URL arrives via WS status-remediation.reference_url
    await this.fetch<void>('POST', '/pull_request', { remediation_id: remediationId }, undefined, 'raw')
  }

  async getRepositories(page = 0): Promise<ReposResult> {
    if (MOCK_MODE) {
      const data = await loadFixture('repos')
      return parseRepos(data)
    }
    const qs = new URLSearchParams({
      pagination_page: String(page),
      pagination_pageSize: '100',
      pagination_with_count: 'true',
    })
    const raw = await this.fetch<unknown>('GET', `/repositories?${qs}`, undefined, undefined, 'jsonapi')
    return parseRepos(raw)
  }

  async getApiTokens(): Promise<ApiTokenListItem[]> {
    if (MOCK_MODE) return []
    const raw = await this.fetch<unknown>('GET', '/users/me/api-tokens')
    return ApiTokensListSchema.parse(raw)
  }

  async generateApiToken(name: string): Promise<ApiToken> {
    if (MOCK_MODE) {
      return { id: 'mock-token-id', name, token: 'sk-mock-token', created_at: new Date().toISOString() }
    }
    return this.fetch<ApiToken>('POST', '/users/me/api-tokens', { name }, ApiTokenCreatedSchema)
  }

  // FIXME-11: GitLab and Bitbucket OAuth endpoints don't exist in backend yet.
  // Only 'github' is valid until the backend exposes equivalent routes.
  async getOAuthUrl(provider: 'github'): Promise<string> {
    if (MOCK_MODE) return `https://github.com/login/oauth/authorize?mock=1`
    const data = await this.fetch<{ oauth_url: string }>('GET', '/request-oauth-github', undefined, undefined, 'raw')
    return data.oauth_url
  }

  async checkScmValidity(): Promise<Record<string, boolean>> {
    if (MOCK_MODE) return { github: false, gitlab: false, bitbucket: false, gitea: false }
    return this.fetch<Record<string, boolean>>('GET', '/integrations/scm/check_validity')
  }

  async getScmRepos(provider: string): Promise<ScmRepo[]> {
    if (MOCK_MODE) {
      return [
        { id: '1', name: 'api-service', full_name: 'org/api-service', html_url: 'https://github.com/org/api-service' },
        { id: '2', name: 'frontend-app', full_name: 'org/frontend-app', html_url: 'https://github.com/org/frontend-app' },
      ]
    }
    // FIXME-13: /api/oauth/{provider}/repos doesn't exist — use vulnerability_tool endpoint
    const raw = await this.fetch<unknown>('GET', `/vulnerability_tool/repositories/${provider}?page=1&per_page=100`)
    if (Array.isArray(raw)) return raw as ScmRepo[]
    return []
  }

  async saveGiteaConnector(_giteaUrl: string, _token: string): Promise<void> {
    if (MOCK_MODE) return
    // FIXME-14: Gitea connector backend endpoint does not exist yet
    throw new Error('Gitea connector not yet supported — backend endpoint pending')
  }

  async testScmConnection(provider: string): Promise<boolean> {
    if (MOCK_MODE) return true
    // FIXME-15: switched from POST /api/oauth/test-connection to GET /integrations/scm/test_connection/{provider}
    const data = await this.fetch<{ success: boolean }>('GET', `/integrations/scm/test_connection/${provider}`, undefined, undefined, 'raw')
    return data.success
  }

  async importRepositories(repos: ScmRepo[], sourceControl: string): Promise<void> {
    if (MOCK_MODE) return
    // FIXME-16: body shape changed -- backend expects {data: [...], source_control}
    const data = repos.map(r => ({
      nickname: r.name,
      uri: r.html_url ?? r.clone_url ?? '',
      type: 'git_repository',
      source_control: sourceControl,
      data: {
        git_connection: {
          repo_branch: 'main',
          repo_id: r.id,
          repo_url: r.html_url ?? r.clone_url ?? '',
        },
      },
    }))
    await this.fetch<void>('POST', '/create_repository_with_list', { data, source_control: sourceControl }, undefined, 'raw')
  }

  async requestScan(repositoryId: string, scanType: string = 'app'): Promise<void> {
    if (MOCK_MODE) return
    await this.fetch<void>('POST', '/request_repo_scan', { repository_id: repositoryId, scan_type: scanType }, undefined, 'raw')
  }
}
