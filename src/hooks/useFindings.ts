import { useEffect, useRef, useMemo } from 'react'
import { useAppState } from '../state/AppState.js'
import { PlexicusApi } from '../services/plexicusApi.js'
import { loadConfig } from '../services/config.js'
import { sortBySeverity } from '../utils/severity.js'

export function useFindings(opts?: { cve?: string }) {
  const { state, dispatch } = useAppState()

  const repoMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const repo of state.repos) {
      map.set(repo.id, repo.nickname)
    }
    return map
  }, [state.repos])

  // Track in-flight abort controller to cancel stale requests
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!state.isAuthenticated) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    async function fetchFindings() {
      dispatch({ type: 'findings/loading', payload: true })
      try {
        const config = await loadConfig()
        const api = new PlexicusApi({ baseUrl: config.serverUrl, token: state.token ?? config.token })

        const { findings, total, pageCount } = await api.getFindings(
          state.findingsFilter,
          state.findingsPage,
          repoMap.size > 0 ? repoMap : undefined,
        )

        if (controller.signal.aborted) return

        const sorted = sortBySeverity(findings)
        dispatch({ type: 'findings/set', payload: sorted })
        dispatch({ type: 'findings/setPagination', payload: { total, pageCount } })

        if (opts?.cve) {
          const match = sorted.find(f => f.cve === opts.cve)
          if (match) {
            dispatch({ type: 'findings/select', payload: match.id })
          } else {
            dispatch({ type: 'ui/setError', payload: `CVE ${opts.cve} not found in findings` })
          }
        }
      } catch (err) {
        if (controller.signal.aborted) return
        dispatch({ type: 'findings/loading', payload: false })
        dispatch({ type: 'ui/setError', payload: err instanceof Error ? err.message : 'Failed to load findings' })
      }
    }

    fetchFindings()

    return () => { controller.abort() }
    // repoMap intentionally excluded: nickname enrichment refreshes on next filter/page change,
    // avoiding an extra re-fetch when repos load concurrently with the initial findings fetch.
  }, [state.isAuthenticated, state.findingsFilter, state.findingsPage])

  return {
    findings: state.findings,
    loading: state.findingsLoading,
    selectedId: state.selectedFindingId,
  }
}
