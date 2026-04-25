import { useEffect } from 'react'
import { useAppState } from '../state/AppState.js'
import { plexicusWs } from '../services/websocket.js'
import type { Config } from '../services/config.js'

function deriveWsUrl(serverUrl: string, wsUrl?: string): string {
  if (wsUrl) return wsUrl
  return serverUrl.replace(/^https?:\/\//, 'wss://')
}

export function useWebSocket(config: Config) {
  const { state, dispatch } = useAppState()

  useEffect(() => {
    if (!state.isAuthenticated || !state.user?.client_id || !state.token) return

    const wsUrl = deriveWsUrl(config.serverUrl, config.wsUrl)
    const clientId = state.user.client_id
    const token = state.token

    plexicusWs.connect(wsUrl, clientId, token, (connected) => {
      dispatch({ type: 'ws/setConnected', payload: connected })
    })

    plexicusWs.on('trigger-check-repository', (msg) => {
      const id = String(msg.repository_id ?? msg._id ?? '')
      dispatch({
        type: 'status/open',
        payload: { type: 'repo', id, name: String(msg.repository_url ?? id), status: 'scanning', progress: 0, logs: [] },
      })
    })

    plexicusWs.on('status-repository', (msg) => {
      const id = String(msg.repository_id ?? msg._id ?? '')
      const logs = msg.page_console ? [String(msg.page_console)] : []
      dispatch({
        type: 'status/update',
        payload: { id, status: String(msg.status ?? ''), progress: Number(msg.percentage_complete ?? 0), logs },
      })
    })

    plexicusWs.on('trigger-finish-repository', (msg) => {
      const id = String(msg.repository_id ?? msg._id ?? '')
      dispatch({ type: 'status/update', payload: { id, status: 'done', progress: 100, logs: [] } })
      setTimeout(() => dispatch({ type: 'status/close' }), 2000)
    })

    plexicusWs.on('status-remediation', (msg) => {
      const id = String(msg.remediation_id ?? msg.finding_id ?? '')
      const logs = msg.page_console ? [String(msg.page_console)] : []
      dispatch({
        type: 'status/update',
        payload: { id, status: String(msg.processing_status ?? msg.status ?? ''), progress: Number(msg.percentage_complete ?? 0), logs },
      })
      if (msg.processing_status === 'ready') {
        setTimeout(() => dispatch({ type: 'status/close' }), 2000)
      }
    })

    plexicusWs.on('workflow_progress_update', (msg) => {
      const id = String(msg.remediation_id ?? msg.finding_id ?? '')
      dispatch({
        type: 'status/update',
        payload: { id, status: String(msg.status ?? ''), progress: Number(msg.percentage_complete ?? 0), logs: [] },
      })
    })

    return () => {
      plexicusWs.disconnect()
      dispatch({ type: 'ws/setConnected', payload: false })
    }
  }, [state.isAuthenticated, state.user?.client_id, config.serverUrl, config.wsUrl])
}
