import React, { useCallback, useRef } from 'react'
import { useAppState } from '../state/AppState.js'
import { PlexicusApi } from '../services/plexicusApi.js'
import { loadConfig } from '../services/config.js'

const POLL_INTERVAL_MS = 2000
const MAX_POLL_ATTEMPTS = 30

export function useRemediation(findingId: string | null) {
  const { state, dispatch } = useAppState()
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  const trigger = useCallback(async () => {
    if (!findingId) return

    dispatch({ type: 'ui/setError', payload: null })

    try {
      const config = await loadConfig()
      const api = new PlexicusApi({ baseUrl: config.serverUrl, token: state.token ?? config.token })

      // Create remediation
      const remediation = await api.createRemediation(findingId)
      dispatch({ type: 'remediation/set', payload: remediation })

      if (remediation.status === 'ready') return

      // Poll until ready
      let attempts = 0
      stopPolling()
      pollingRef.current = setInterval(async () => {
        attempts++
        if (attempts >= MAX_POLL_ATTEMPTS) {
          stopPolling()
          dispatch({ type: 'ui/setError', payload: 'Remediation timed out after 60s' })
          return
        }

        try {
          const remediations = await api.getRemediations(findingId)
          const updated = remediations.find(r => r.finding_id === findingId)
          if (updated) {
            dispatch({ type: 'remediation/set', payload: updated })
            if (updated.status === 'ready') {
              stopPolling()
            }
          }
        } catch {
          stopPolling()
          dispatch({ type: 'ui/setError', payload: 'Failed to poll remediation status' })
        }
      }, POLL_INTERVAL_MS)
    } catch (err) {
      dispatch({ type: 'ui/setError', payload: err instanceof Error ? err.message : 'Failed to create remediation' })
    }
  }, [findingId, state.token, dispatch, stopPolling])

  const applyPR = useCallback(async () => {
    if (!findingId) return
    const remediation = findingId ? state.remediations[findingId] : null
    if (!remediation || remediation.status !== 'ready') return

    try {
      const config = await loadConfig()
      const api = new PlexicusApi({ baseUrl: config.serverUrl, token: state.token ?? config.token })
      const pr = await api.createPR(remediation.id)
      dispatch({ type: 'ui/setError', payload: null })
      dispatch({ type: 'ui/setError', payload: `✓ PR created: ${pr.url}` })
    } catch (err) {
      dispatch({ type: 'ui/setError', payload: err instanceof Error ? err.message : 'Failed to create PR' })
    }
  }, [findingId, state.remediations, state.token, dispatch])

  // Clean up polling interval on unmount
  React.useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  const remediation = findingId ? state.remediations[findingId] ?? null : null

  return { remediation, trigger, applyPR, stopPolling }
}
