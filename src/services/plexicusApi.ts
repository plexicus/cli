import type { Finding, Repository, Remediation, PR, ApiToken, SessionUser } from '../types.js'
import {
  FindingSchema, FindingsListSchema, RepositorySchema, RepositoriesListSchema,
  RemediationSchema, RemediationsListSchema, PRSchema, ApiTokenSchema, ApiTokensListSchema,
  SessionUserSchema, LoginResponseSchema,
} from './apiSchemas.js'
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

// When MOCK_PLEXICUS=1, load fixture instead of fetching
const MOCK_MODE = process.env.MOCK_PLEXICUS === '1'

async function loadFixture(name: string): Promise<unknown> {
  const { default: data } = await import(`../../tests/fixtures/plexicus/${name}.json`, {
    with: { type: 'json' },
  })
  return data
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

  async getFindings(params?: { repo?: string; severities?: string[]; status?: string }): Promise<Finding[]> {
    if (MOCK_MODE) {
      const data = await loadFixture('findings')
      return FindingsListSchema.parse(data)
    }
    const qs = new URLSearchParams()
    if (params?.repo) qs.set('repo', params.repo)
    if (params?.severities?.length) qs.set('severity', params.severities.join(','))
    if (params?.status) qs.set('status', params.status)
    const query = qs.toString() ? `?${qs}` : ''
    return this.fetch<Finding[]>('GET', `/findings${query}`, undefined, FindingsListSchema)
  }

  async getFinding(id: string): Promise<Finding> {
    if (MOCK_MODE) {
      const data = await loadFixture('finding-detail')
      return FindingSchema.parse(data)
    }
    return this.fetch<Finding>('GET', `/findings/${id}`, undefined, FindingSchema)
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
    return this.fetch<Remediation[]>('GET', `/remediations${query}`, undefined, RemediationsListSchema)
  }

  async createPR(remediationId: string): Promise<PR> {
    if (MOCK_MODE) {
      return { remediation_id: remediationId, url: 'https://github.com/example/repo/pull/1', status: 'open' }
    }
    return this.fetch<PR>('POST', '/pull_request', { remediation_id: remediationId }, PRSchema)
  }

  async getRepositories(): Promise<Repository[]> {
    if (MOCK_MODE) {
      const data = await loadFixture('repos')
      return RepositoriesListSchema.parse(data)
    }
    return this.fetch<Repository[]>('GET', '/repositories', undefined, RepositoriesListSchema)
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
