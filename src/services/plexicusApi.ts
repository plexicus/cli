import type { Finding, Repository, Remediation, PR, ApiToken, SessionUser } from '../types.js'
import {
  FindingsResponseSchema, RepositoriesResponseSchema,
  RemediationSchema, RemediationsListSchema, PRSchema,
  ApiTokenSchema, ApiTokensListSchema, SessionUserSchema, LoginResponseSchema,
} from './apiSchemas.js'
import type { FindingsFilter } from '../state/actions.js'
import { PlexicusApiError, PlexicusAuthError } from '../utils/errors.js'

interface ApiConfig {
  baseUrl: string
  token?: string
}

interface LoginResponse {
  access_token: string
  token_type: string
  requires_2fa?: boolean
}

interface FindingsResult {
  findings: Finding[]
  total: number
  pageCount: number
}

interface ReposResult {
  repos: Repository[]
  total: number
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
    qs.set('filters[cvssv3_score_gt]', String(filter.cvss_gt))
  }
  if (filter.cvss_lt !== undefined) {
    qs.set('filters[cvssv3_score_lt]', String(filter.cvss_lt))
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
    const json = await res.json()
    return schema ? schema.parse(json) : (json as T)
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    if (MOCK_MODE) {
      const data = await loadFixture('login')
      return LoginResponseSchema.parse(data)
    }
    return this.fetch<LoginResponse>('POST', '/login', { email, password }, LoginResponseSchema)
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
    return this.fetch<SessionUser>('GET', '/session', undefined, SessionUserSchema)
  }

  async verify2FA(otp: string): Promise<LoginResponse> {
    if (MOCK_MODE) {
      const data = await loadFixture('login')
      return LoginResponseSchema.parse(data)
    }
    return this.fetch<LoginResponse>('POST', '/verify-session', { otp }, LoginResponseSchema)
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
    const raw = await this.fetch<unknown>('GET', `/findings${query}`)
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
    const raw = await this.fetch<unknown>('GET', `/findings/${id}`)
    const result = parseFindings(raw)
    const found = result.findings[0]
    if (!found) throw new PlexicusApiError(`Finding ${id} not found`, 404, `/findings/${id}`)
    return found
  }

  async markMitigated(id: string): Promise<void> {
    if (MOCK_MODE) return
    await this.fetch<void>('POST', `/findings/${id}/mark-as-mitigated`)
  }

  async toggleFalsePositive(id: string): Promise<void> {
    if (MOCK_MODE) return
    await this.fetch<void>('PUT', `/findings/${id}/toggle_false_positive`)
  }

  async createRemediation(findingId: string): Promise<Remediation> {
    if (MOCK_MODE) {
      const data = await loadFixture('remediation')
      return RemediationSchema.parse(data)
    }
    return this.fetch<Remediation>('POST', '/remediations', { finding_id: findingId }, RemediationSchema)
  }

  async getRemediations(findingId?: string): Promise<Remediation[]> {
    if (MOCK_MODE) {
      const data = await loadFixture('remediation')
      return RemediationsListSchema.parse([data])
    }
    const query = findingId ? `?finding_id=${findingId}` : ''
    return this.fetch<Remediation[]>(`GET`, `/remediations${query}`, undefined, RemediationsListSchema)
  }

  async createPR(remediationId: string): Promise<PR> {
    if (MOCK_MODE) {
      return { remediation_id: remediationId, url: 'https://github.com/example/repo/pull/1', status: 'open' }
    }
    return this.fetch<PR>('POST', '/pull_request', { remediation_id: remediationId }, PRSchema)
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
    const raw = await this.fetch<unknown>('GET', `/repositories?${qs}`)
    return parseRepos(raw)
  }

  async getApiTokens(): Promise<ApiToken[]> {
    if (MOCK_MODE) return []
    return this.fetch<ApiToken[]>('GET', '/users/me/api-tokens', undefined, ApiTokensListSchema)
  }

  async generateApiToken(name: string): Promise<ApiToken> {
    if (MOCK_MODE) {
      return { id: 'mock-token-id', name, token: 'sk-mock-token', created_at: new Date().toISOString() }
    }
    return this.fetch<ApiToken>('POST', '/users/me/api-tokens', { name }, ApiTokenSchema)
  }
}
