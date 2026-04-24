import { useEffect, useRef, useMemo } from 'react'
import { useAppState } from '../state/AppState.js'
import { PlexicusApi } from '../services/plexicusApi.js'
import { loadConfig } from '../services/config.js'
import { sortBySeverity } from '../utils/severity.js'

export function useFindings(opts?: { repo?: string; cve?: string }) {
  const { state, dispatch } = useAppState()
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!state.isAuthenticated) return
    if (initializedRef.current) return
    initializedRef.current = true

    async function fetchFindings() {
      dispatch({ type: 'findings/loading', payload: true })
      try {
        const config = await loadConfig()
        const api = new PlexicusApi({ baseUrl: config.serverUrl, token: state.token ?? config.token })

        const filter = state.findingsFilter
        const findings = await api.getFindings({
          repo: opts?.repo ?? filter.repo,
          severities: filter.severities,
        })

        const sorted = sortBySeverity(findings)
        dispatch({ type: 'findings/set', payload: sorted })

        // --cve flag: auto-select and open detail pane
        if (opts?.cve) {
          const match = sorted.find(f => f.cve_id === opts.cve)
          if (match) {
            dispatch({ type: 'findings/select', payload: match.id })
          } else {
            dispatch({ type: 'ui/setError', payload: `CVE ${opts.cve} not found in findings` })
          }
        }
      } catch (err) {
        dispatch({ type: 'findings/loading', payload: false })
        dispatch({ type: 'ui/setError', payload: err instanceof Error ? err.message : 'Failed to load findings' })
      }
    }

    fetchFindings()
  }, [state.isAuthenticated])

  const findings = useMemo(() => {
    let result = state.findings
    if (state.findingsFilter.severities?.length) {
      result = result.filter(f => state.findingsFilter.severities!.includes(f.severity))
    }
    if (state.findingsFilter.repo) {
      result = result.filter(f => f.repo === state.findingsFilter.repo)
    }
    return result
  }, [state.findings, state.findingsFilter])

  return {
    findings,
    loading: state.findingsLoading,
    selectedId: state.selectedFindingId,
  }
}
