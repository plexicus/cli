import React, { useCallback, useRef, useState } from 'react'
import { useAppState } from '../state/AppState.js'
import { PlexicusApi } from '../services/plexicusApi.js'
import { loadConfig } from '../services/config.js'

const MOCK_MODE = process.env.MOCK_PLEXICUS === '1'
const POLL_INTERVAL_MS = 2000
const MAX_POLL_ATTEMPTS = 30

export function useRemediation(findingId: string | null) {
  const { state, dispatch } = useAppState()
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [prUrl, setPrUrl] = useState<string | null>(null)

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  const trigger = useCallback(async () => {
    if (!findingId) return

    dispatch({ type: 'ui/setError', payload: null })

    if (MOCK_MODE) {
      const { mockFlowState, runMockRemediationFlow, getMockDiff } = await import('../services/mockRemediation.js')

      const flowStatus = mockFlowState.get(findingId)

      if (flowStatus === 'ready') {
        const existing = state.remediations[findingId]
        if (!existing || existing.status !== 'ready') {
          dispatch({
            type: 'remediation/set',
            payload: {
              id: `rem-${findingId}`,
              finding_id: findingId,
              status: 'ready',
              diff: getMockDiff(findingId),
              auto_create: false,
            },
          })
        }
        return
      }

      if (flowStatus === 'running') return

      dispatch({
        type: 'remediation/set',
        payload: {
          id: `rem-${findingId}`,
          finding_id: findingId,
          status: 'pending',
          diff: null,
          auto_create: false,
        },
      })

      const finding = state.findings.find(f => f.id === findingId)
      const title = finding?.title ?? findingId
      void runMockRemediationFlow(findingId, title, dispatch).then(() => {
        dispatch({
          type: 'remediation/set',
          payload: {
            id: `rem-${findingId}`,
            finding_id: findingId,
            status: 'ready',
            diff: getMockDiff(findingId),
            auto_create: false,
          },
        })
        setTimeout(() => dispatch({ type: 'status/close' }), 2000)
      })
      return
    }

    try {
      const config = await loadConfig()
      const api = new PlexicusApi({ baseUrl: config.serverUrl, token: state.token ?? config.token })

      dispatch({
        type: 'remediation/set',
        payload: { id: `rem-${findingId}`, finding_id: findingId, status: 'pending', diff: null, auto_create: false },
      })
      await api.createRemediation(findingId)

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
  }, [findingId, state.token, state.findings, state.remediations, dispatch, stopPolling])

  const applyPR = useCallback(async () => {
    if (!findingId) return
    const remediation = findingId ? state.remediations[findingId] : null
    if (!remediation || remediation.status !== 'ready') return

    if (MOCK_MODE) {
      dispatch({ type: 'status/close' })
      const finding = state.findings.find(f => f.id === findingId)
      const repo = finding?.repo_nickname ?? finding?.repo_id ?? 'repo'
      const prNum = Math.floor(Math.random() * 900) + 100
      const url = `https://github.com/plexicus/${repo}/pull/${prNum}`
      setPrUrl(url)
      dispatch({ type: 'ui/setNotification', payload: `PR #${prNum} created → ${url}` })
      return
    }

    try {
      const config = await loadConfig()
      const api = new PlexicusApi({ baseUrl: config.serverUrl, token: state.token ?? config.token })
      await api.createPR(remediation.id)
      dispatch({ type: 'ui/setNotification', payload: 'PR creation triggered — check your repository' })
    } catch (err) {
      dispatch({ type: 'ui/setError', payload: err instanceof Error ? err.message : 'Failed to create PR' })
    }
  }, [findingId, state.remediations, state.findings, state.token, dispatch])

  React.useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  const remediation = findingId ? state.remediations[findingId] ?? null : null

  return { remediation, trigger, applyPR, stopPolling, prUrl }
}
