import type { LocalCommand } from '../../commands.js'
import type { FindingSeverity } from '../../types.js'

const VALID_SEVERITIES = new Set<FindingSeverity>(['critical', 'high', 'medium', 'low', 'informational'])

const filterCommand: LocalCommand = {
  name: 'filter',
  type: 'local',
  description: 'Filter findings (/filter severity:critical,high repo:myapp)',
  call: async (args, ctx) => {
    const filter: { repo?: string; severities?: FindingSeverity[] } = {}
    for (const arg of args) {
      const [k, v] = arg.split(':')
      if ((k === 'severity' || k === 'severities') && v) {
        const severities = v.split(',').filter((s): s is FindingSeverity => VALID_SEVERITIES.has(s as FindingSeverity))
        if (severities.length) filter.severities = severities
      }
      if (k === 'repo' && v) filter.repo = v
    }
    ctx.dispatch({ type: 'findings/filter', payload: filter })
    const desc = [
      filter.severities ? `severity: ${filter.severities.join(', ')}` : '',
      filter.repo ? `repo: ${filter.repo}` : '',
    ].filter(Boolean).join(', ')
    return `Filter applied${desc ? ': ' + desc : ''}`
  },
}

export default filterCommand
