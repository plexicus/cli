import chalk from 'chalk'
import type { FindingSeverity } from '../types.js'

const SEVERITY_ORDER: Record<FindingSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  informational: 0,
}

export function severityRank(severity: FindingSeverity): number {
  return SEVERITY_ORDER[severity]
}

export function severityColor(severity: FindingSeverity): string {
  switch (severity) {
    case 'critical': return 'red'
    case 'high': return 'yellow'
    case 'medium': return 'blue'
    case 'low': return 'green'
    case 'informational': return 'gray'
  }
}

export function severityBadge(severity: FindingSeverity): string {
  const label = severity.toUpperCase().slice(0, 4).padEnd(4)
  return `[${label}]`
}

export function cvssColor(score: number | null): string {
  if (score === null) return 'gray'
  if (score >= 9.0) return 'red'
  if (score >= 7.0) return 'yellow'
  if (score >= 4.0) return 'blue'
  return 'green'
}

export function sortBySeverity<T extends { severity: FindingSeverity }>(items: T[]): T[] {
  return [...items].sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
}
