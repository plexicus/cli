import { useEffect, useRef } from 'react'
import { useAppState } from '../state/AppState.js'
import { PlexicusApi } from '../services/plexicusApi.js'
import { loadConfig } from '../services/config.js'

export function useRepos() {
  const { state, dispatch } = useAppState()
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (!state.isAuthenticated) return
    if (fetchedRef.current) return
    fetchedRef.current = true

    async function fetchRepos() {
      dispatch({ type: 'repos/loading', payload: true })
      try {
        const config = await loadConfig()
        const api = new PlexicusApi({ baseUrl: config.serverUrl, token: state.token ?? config.token })
        const { repos } = await api.getRepositories()
        dispatch({ type: 'repos/set', payload: repos })
      } catch (err) {
        dispatch({ type: 'repos/loading', payload: false })
        dispatch({ type: 'ui/setError', payload: err instanceof Error ? err.message : 'Failed to load repos' })
      }
    }

    fetchRepos()
  }, [state.isAuthenticated])

  return {
    repos: state.repos,
    loading: state.reposLoading,
  }
}
