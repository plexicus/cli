import type { LocalCommand } from '../../commands.js'
import type { FindingSeverity, FindingStatus, FindingType } from '../../types.js'
import type { FindingsFilter } from '../../state/actions.js'

const VALID_SEVERITIES = new Set<FindingSeverity>(['critical', 'high', 'medium', 'low', 'informational'])
const VALID_STATUSES = new Set<FindingStatus>(['open', 'mitigated', 'enriched'])
const VALID_TYPES = new Set<FindingType>(['SAST', 'SCA', 'DAST'])

const filterCommand: LocalCommand = {
  name: 'filter',
  type: 'local',
  description: 'Filter findings (/filter severity:critical,high repo:myapp status:open)',
  call: async (args, ctx) => {
    const filter: FindingsFilter = {}
    for (const arg of args) {
      const colonIdx = arg.indexOf(':')
      if (colonIdx === -1) continue
      const k = arg.slice(0, colonIdx)
      const v = arg.slice(colonIdx + 1)
      if (!v) continue

      if (k === 'severity' || k === 'severities') {
        const severities = v.split(',').filter((s): s is FindingSeverity => VALID_SEVERITIES.has(s as FindingSeverity))
        if (severities.length) filter.severities = severities
      }
      if (k === 'repo' || k === 'repository') {
        // Look up repo id from state.repos by nickname
        const repos = ctx.state.repos
        const match = repos.find(r => r.nickname === v || r.id === v)
        if (match) {
          filter.repository_ids = [match.id]
        }
      }
      if (k === 'status') {
        const statuses = v.split(',').filter((s): s is FindingStatus => VALID_STATUSES.has(s as FindingStatus))
        if (statuses.length) filter.statuses = statuses
      }
      if (k === 'type') {
        const types = v.split(',').filter((t): t is FindingType => VALID_TYPES.has(t as FindingType))
        if (types.length) filter.types = types
      }
      if (k === 'language') filter.languages = [v]
      if (k === 'category') filter.categories = [v]
    }
    ctx.dispatch({ type: 'findings/filter', payload: filter })
    const desc = [
      filter.severities ? `severity: ${filter.severities.join(', ')}` : '',
      filter.repository_ids ? `repo ids: ${filter.repository_ids.join(', ')}` : '',
      filter.statuses ? `status: ${filter.statuses.join(', ')}` : '',
    ].filter(Boolean).join(', ')
    return `Filter applied${desc ? ': ' + desc : ''}`
  },
}

export default filterCommand
