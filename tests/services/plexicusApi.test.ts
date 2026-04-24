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
    const findings = await api.getFindings()
    expect(Array.isArray(findings)).toBe(true)
    expect(findings.length).toBeGreaterThan(0)
    expect(findings[0]).toHaveProperty('id')
    expect(findings[0]).toHaveProperty('severity')
    expect(findings[0]).toHaveProperty('name')
  })

  it('getFinding returns a single finding', async () => {
    const finding = await api.getFinding('f-001')
    expect(finding.id).toBeDefined()
    expect(finding.severity).toBeDefined()
    expect(finding.cve_id).toBeDefined()
  })

  it('getRepositories returns array of repos', async () => {
    const repos = await api.getRepositories()
    expect(Array.isArray(repos)).toBe(true)
    expect(repos.length).toBeGreaterThan(0)
    expect(repos[0]).toHaveProperty('id')
    expect(repos[0]).toHaveProperty('scan_status')
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
})
