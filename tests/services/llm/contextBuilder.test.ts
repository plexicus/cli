import { describe, it, expect } from 'bun:test'
import { buildFindingsSystemPrompt } from '../../../src/services/llm/contextBuilder.js'
import type { Finding } from '../../../src/types.js'

const makeFinding = (overrides: Partial<Finding> = {}): Finding => ({
  id: 'f-001',
  severity: 'critical',
  title: 'SQL Injection',
  cve: 'CVE-2023-1234',
  repo_id: 'r-001',
  repo_nickname: 'api-service',
  file_path: 'src/auth.py',
  line: 42,
  cvssv3_score: 9.8,
  cvssv4_score: null,
  status: 'open',
  description: 'Test finding',
  date: '2024-01-01T00:00:00Z',
  severity_numerical: 90,
  type: 'SAST',
  category: 'Application',
  tool: 'semgrep',
  language: 'python',
  cwe: 89,
  extra_cwe: [],
  prioritization_value: 85,
  effort_for_fixing: 30,
  exploitability: 80,
  impact: 90,
  confidence: 75,
  estimated_epss: 0.12,
  is_false_positive: false,
  is_duplicate: false,
  is_sandbox: false,
  owasps: [],
  policy_rules: [],
  tags: [],
  mitigation: null,
  single_line_code: null,
  policy_name: null,
  ...overrides,
})

describe('buildFindingsSystemPrompt', () => {
  it('returns a non-empty string', () => {
    const prompt = buildFindingsSystemPrompt([makeFinding()])
    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(0)
  })

  it('includes finding title in prompt', () => {
    const prompt = buildFindingsSystemPrompt([makeFinding({ title: 'XSS Attack' })])
    expect(prompt).toContain('XSS Attack')
  })

  it('includes CVE ID when present', () => {
    const prompt = buildFindingsSystemPrompt([makeFinding({ cve: 'CVE-2023-9999' })])
    expect(prompt).toContain('CVE-2023-9999')
  })

  it('handles null CVE gracefully', () => {
    const prompt = buildFindingsSystemPrompt([makeFinding({ cve: null })])
    expect(typeof prompt).toBe('string')
    expect(prompt).not.toContain('null')
  })

  it('handles empty findings array', () => {
    const prompt = buildFindingsSystemPrompt([])
    expect(typeof prompt).toBe('string')
  })

  it('limits to maxItems findings', () => {
    const manyFindings = Array.from({ length: 30 }, (_, i) =>
      makeFinding({ id: `f-${i}`, title: `Finding ${i}` })
    )
    const prompt = buildFindingsSystemPrompt(manyFindings, 5)
    const matches = (prompt.match(/Finding \d+/g) ?? []).length
    expect(matches).toBeLessThanOrEqual(5)
  })

  it('prioritizes critical over low severity', () => {
    const findings = [
      makeFinding({ id: 'low-1', severity: 'low', title: 'Low Severity Issue' }),
      makeFinding({ id: 'crit-1', severity: 'critical', title: 'Critical Issue' }),
    ]
    const prompt = buildFindingsSystemPrompt(findings, 1)
    expect(prompt).toContain('Critical Issue')
    expect(prompt).not.toContain('Low Severity Issue')
  })
})
