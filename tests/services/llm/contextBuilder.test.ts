import { describe, it, expect } from 'bun:test'
import { buildFindingsSystemPrompt } from '../../../src/services/llm/contextBuilder.js'
import type { Finding } from '../../../src/types.js'

const makeFinding = (overrides: Partial<Finding> = {}): Finding => ({
  id: 'f-001',
  severity: 'critical',
  name: 'SQL Injection',
  cve_id: 'CVE-2023-1234',
  repo: 'api-service',
  file: 'src/auth.py',
  line: 42,
  cvss_score: 9.8,
  status: 'open',
  description: 'Test finding',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

describe('buildFindingsSystemPrompt', () => {
  it('returns a non-empty string', () => {
    const prompt = buildFindingsSystemPrompt([makeFinding()])
    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(0)
  })

  it('includes finding name in prompt', () => {
    const prompt = buildFindingsSystemPrompt([makeFinding({ name: 'XSS Attack' })])
    expect(prompt).toContain('XSS Attack')
  })

  it('includes CVE ID when present', () => {
    const prompt = buildFindingsSystemPrompt([makeFinding({ cve_id: 'CVE-2023-9999' })])
    expect(prompt).toContain('CVE-2023-9999')
  })

  it('handles null CVE ID gracefully', () => {
    const prompt = buildFindingsSystemPrompt([makeFinding({ cve_id: null })])
    expect(typeof prompt).toBe('string')
    expect(prompt).not.toContain('null')
  })

  it('handles empty findings array', () => {
    const prompt = buildFindingsSystemPrompt([])
    expect(typeof prompt).toBe('string')
  })

  it('limits to maxItems findings', () => {
    const manyFindings = Array.from({ length: 30 }, (_, i) =>
      makeFinding({ id: `f-${i}`, name: `Finding ${i}` })
    )
    const prompt = buildFindingsSystemPrompt(manyFindings, 5)
    // Should only include 5 findings — check that not all 30 names appear
    const matches = (prompt.match(/Finding \d+/g) ?? []).length
    expect(matches).toBeLessThanOrEqual(5)
  })

  it('prioritizes critical over low severity', () => {
    const findings = [
      makeFinding({ id: 'low-1', severity: 'low', name: 'Low Severity Issue' }),
      makeFinding({ id: 'crit-1', severity: 'critical', name: 'Critical Issue' }),
    ]
    const prompt = buildFindingsSystemPrompt(findings, 1)
    expect(prompt).toContain('Critical Issue')
    expect(prompt).not.toContain('Low Severity Issue')
  })
})
