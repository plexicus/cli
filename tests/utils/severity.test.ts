import { describe, it, expect } from 'bun:test'
import { severityRank, severityColor, severityBadge, cvssColor, sortBySeverity } from '../../src/utils/severity.js'
import type { Finding } from '../../src/types.js'

describe('severityRank', () => {
  it('ranks critical highest', () => {
    expect(severityRank('critical')).toBeGreaterThan(severityRank('high'))
  })
  it('ranks in correct order', () => {
    expect(severityRank('critical')).toBe(4)
    expect(severityRank('high')).toBe(3)
    expect(severityRank('medium')).toBe(2)
    expect(severityRank('low')).toBe(1)
    expect(severityRank('informational')).toBe(0)
  })
})

describe('severityBadge', () => {
  it('returns bracketed label', () => {
    expect(severityBadge('critical')).toMatch(/\[CRIT\]/)
    expect(severityBadge('high')).toMatch(/\[HIGH\]/)
  })
  it('pads to consistent width', () => {
    const badges = ['critical', 'high', 'medium', 'low', 'informational'].map(s => severityBadge(s as any))
    const lengths = badges.map(b => b.length)
    expect(new Set(lengths).size).toBe(1)
  })
})

describe('severityColor', () => {
  it('returns red for critical', () => expect(severityColor('critical')).toBe('red'))
  it('returns yellow for high', () => expect(severityColor('high')).toBe('yellow'))
  it('returns green for low', () => expect(severityColor('low')).toBe('green'))
})

describe('cvssColor', () => {
  it('returns red for score >= 9.0', () => expect(cvssColor(9.8)).toBe('red'))
  it('returns yellow for score >= 7.0', () => expect(cvssColor(7.5)).toBe('yellow'))
  it('returns blue for score >= 4.0', () => expect(cvssColor(5.0)).toBe('blue'))
  it('returns green for low scores', () => expect(cvssColor(2.0)).toBe('green'))
  it('returns gray for null', () => expect(cvssColor(null)).toBe('gray'))
})

describe('sortBySeverity', () => {
  it('sorts critical first', () => {
    const items = [
      { severity: 'low' as const }, { severity: 'critical' as const }, { severity: 'high' as const }
    ]
    const sorted = sortBySeverity(items)
    expect(sorted[0].severity).toBe('critical')
    expect(sorted[1].severity).toBe('high')
    expect(sorted[2].severity).toBe('low')
  })
  it('does not mutate input array', () => {
    const items = [{ severity: 'low' as const }, { severity: 'critical' as const }]
    const original = [...items]
    sortBySeverity(items)
    expect(items).toEqual(original)
  })
})
