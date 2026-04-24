import type { Finding } from '../../types.js'

const SEVERITY_PRIORITY = { critical: 4, high: 3, medium: 2, low: 1, informational: 0 }

export function buildFindingsSystemPrompt(findings: Finding[], maxItems = 20): string {
  const prioritized = [...findings]
    .sort((a, b) => SEVERITY_PRIORITY[b.severity] - SEVERITY_PRIORITY[a.severity])
    .slice(0, maxItems)

  const findingLines = prioritized.map(f => {
    const cve = f.cve_id ? ` (${f.cve_id})` : ''
    const loc = f.file ? ` at ${f.file}${f.line ? `:${f.line}` : ''}` : ''
    return `- [${f.severity.toUpperCase()}] ${f.name}${cve} in ${f.repo}${loc}`
  })

  return `You are a security assistant for the Plexicus ASPM platform.
The user's current security posture (${findings.length} total findings):
${findingLines.join('\n')}

Answer questions about these findings, suggest remediation strategies, and explain vulnerabilities. Be concise and actionable.`
}
