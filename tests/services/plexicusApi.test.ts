import { describe, it, expect, beforeAll } from 'bun:test'
import type { PlexicusApi as PlexicusApiType } from '../../src/services/plexicusApi.js'

// MOCK_MODE is evaluated at module load in plexicusApi.ts.
// Set env var before the dynamic import so the flag is captured correctly.
process.env.MOCK_PLEXICUS = '1'

let api: PlexicusApiType

beforeAll(async () => {
  const { PlexicusApi } = await import('../../src/services/plexicusApi.js')
  api = new PlexicusApi({ baseUrl: 'https://api.app.plexicus.ai' })
})

describe('PlexicusApi (mock mode)', () => {
  it('getFindings returns array of findings', async () => {
    const { findings } = await api.getFindings()
    expect(Array.isArray(findings)).toBe(true)
    expect(findings.length).toBeGreaterThan(0)
    expect(findings[0]).toHaveProperty('id')
    expect(findings[0]).toHaveProperty('severity')
    expect(findings[0]).toHaveProperty('title')
  })

  it('getFindings returns pagination metadata', async () => {
    const { total, pageCount } = await api.getFindings()
    expect(typeof total).toBe('number')
    expect(typeof pageCount).toBe('number')
    expect(total).toBeGreaterThan(0)
    expect(pageCount).toBeGreaterThan(0)
  })

  it('getFinding returns a single finding', async () => {
    const finding = await api.getFinding('f-001')
    expect(finding.id).toBeDefined()
    expect(finding.severity).toBeDefined()
    expect(finding.cve).toBeDefined()
  })

  it('getRepositories returns array of repos', async () => {
    const { repos } = await api.getRepositories()
    expect(Array.isArray(repos)).toBe(true)
    expect(repos.length).toBeGreaterThan(0)
    expect(repos[0]).toHaveProperty('id')
    expect(repos[0]).toHaveProperty('nickname')
    expect(repos[0]).toHaveProperty('finding_counts')
  })

  it('createRemediation returns a remediation', async () => {
    const rem = await api.createRemediation('f-001')
    expect(rem.finding_id).toBe('f-001')
    expect(rem.status).toBeDefined()
    expect(['pending', 'ready', 'applied']).toContain(rem.status)
  })

  it('login returns access_token', async () => {
    const resp = await api.login('test@example.com', 'password')
    expect(resp.access_token).toBeDefined()
    expect(typeof resp.access_token).toBe('string')
  })

  it('getApiTokens returns array', async () => {
    const tokens = await api.getApiTokens()
    expect(Array.isArray(tokens)).toBe(true)
  })

  it('finding has new JSON:API field names', async () => {
    const { findings } = await api.getFindings()
    const f = findings[0]!
    expect(f).toHaveProperty('title')
    expect(f).toHaveProperty('file_path')
    expect(f).toHaveProperty('cvssv3_score')
    expect(f).toHaveProperty('date')
    expect(f).toHaveProperty('is_false_positive')
    expect(f).toHaveProperty('repo_id')
  })

  it('repo has new JSON:API field names', async () => {
    const { repos } = await api.getRepositories()
    const r = repos[0]!
    expect(r).toHaveProperty('id')
    expect(r).toHaveProperty('nickname')
    expect(r).toHaveProperty('source_control')
    expect(r).toHaveProperty('finding_counts')
    expect(r.finding_counts).toHaveProperty('total')
  })
})
