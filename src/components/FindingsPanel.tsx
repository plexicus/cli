import React, { useState, useCallback, useEffect } from 'react'
import { Box, Text } from 'ink'
import { useAppState } from '../state/AppState.js'
import { useKeymap } from '../hooks/useKeymap.js'
import { useFindings } from '../hooks/useFindings.js'
import { Spinner } from './design-system/Spinner.js'
import { FuzzyPicker } from './design-system/FuzzyPicker.js'
import { severityBadge, severityColor } from '../utils/severity.js'
import type { Finding } from '../types.js'
import type { FindingsFilter } from '../state/actions.js'

function formatDate(dateStr: string): string {
  return dateStr.slice(0, 10)
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

function isFilterActive(filter: FindingsFilter): boolean {
  return Object.values(filter as Record<string, unknown>).some(v => {
    if (Array.isArray(v)) return v.length > 0
    return v !== undefined && v !== null && v !== false
  })
}

interface FindingsPanelProps {
  repo?: string
  cve?: string
}

export function FindingsPanel({ repo, cve }: FindingsPanelProps) {
  const { state, dispatch } = useAppState()
  const { findings, loading } = useFindings({ cve })
  const [cursorIndex, setCursorIndex] = useState(0)

  const pageFindings = findings
  const hasFilter = isFilterActive(state.findingsFilter)

  // Reset cursor when page or filter changes
  useEffect(() => {
    setCursorIndex(0)
  }, [state.findingsPage, state.findingsFilter])

  const handleDown = useCallback(() => {
    setCursorIndex(i => Math.min(i + 1, pageFindings.length - 1))
  }, [pageFindings.length])

  const handleUp = useCallback(() => {
    setCursorIndex(i => Math.max(i - 1, 0))
  }, [])

  const handleSelect = useCallback(() => {
    const finding = pageFindings[cursorIndex]
    if (finding) dispatch({ type: 'findings/select', payload: finding.id })
  }, [pageFindings, cursorIndex, dispatch])

  const handleEscape = useCallback(() => {
    dispatch({ type: 'findings/select', payload: null })
  }, [dispatch])

  const handleRemediate = useCallback(async () => {
    const finding = pageFindings[cursorIndex]
    if (!finding) return
    dispatch({ type: 'findings/select', payload: finding.id })
  }, [pageFindings, cursorIndex, dispatch])

  const handleSuppress = useCallback(async () => {
    const finding = pageFindings[cursorIndex]
    if (!finding) return
    try {
      const { loadConfig } = await import('../services/config.js')
      const { PlexicusApi } = await import('../services/plexicusApi.js')
      const config = await loadConfig()
      const api = new PlexicusApi({ baseUrl: config.serverUrl, token: state.token ?? config.token })
      await api.markMitigated(finding.id)
      const updated = { ...finding, status: 'mitigated' as const }
      dispatch({ type: 'findings/update', payload: updated })
    } catch (err) {
      dispatch({ type: 'ui/setError', payload: err instanceof Error ? err.message : 'Failed to suppress finding' })
    }
  }, [pageFindings, cursorIndex, dispatch, state.token])

  const handleFalsePositive = useCallback(async () => {
    const finding = pageFindings[cursorIndex]
    if (!finding) return
    try {
      const { loadConfig } = await import('../services/config.js')
      const { PlexicusApi } = await import('../services/plexicusApi.js')
      const config = await loadConfig()
      const api = new PlexicusApi({ baseUrl: config.serverUrl, token: state.token ?? config.token })
      await api.toggleFalsePositive(finding.id)
      const updated = { ...finding, is_false_positive: !finding.is_false_positive }
      dispatch({ type: 'findings/update', payload: updated })
    } catch (err) {
      dispatch({ type: 'ui/setError', payload: err instanceof Error ? err.message : 'Failed to toggle false positive' })
    }
  }, [pageFindings, cursorIndex, dispatch, state.token])

  useKeymap(
    {
      onDown: handleDown,
      onUp: handleUp,
      onSelect: handleSelect,
      onEscape: handleEscape,
      onRemediate: handleRemediate,
      onSuppress: handleSuppress,
      onFalsePositive: handleFalsePositive,
      onNextPage: () => {
        if (state.findingsPage < state.findingsPageCount - 1) {
          dispatch({ type: 'findings/setPage', payload: state.findingsPage + 1 })
        }
      },
      onPrevPage: () => {
        if (state.findingsPage > 0) {
          dispatch({ type: 'findings/setPage', payload: state.findingsPage - 1 })
        }
      },
    },
    { inputMode: state.inputMode, isActive: state.activePanel === 'findings' },
  )

  if (state.fuzzyOpen && state.activePanel === 'findings') {
    return (
      <FuzzyPicker
        items={findings}
        getLabel={(f: Finding) => `${f.title} (${f.repo_nickname ?? f.repo_id})`}
        onSelect={f => {
          dispatch({ type: 'findings/select', payload: f.id })
          dispatch({ type: 'ui/setFuzzyOpen', payload: false })
        }}
        onCancel={() => dispatch({ type: 'ui/setFuzzyOpen', payload: false })}
        placeholder="Search findings..."
      />
    )
  }

  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Spinner label="Loading findings..." />
      </Box>
    )
  }

  if (findings.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="yellow">No findings matching current filter</Text>
        <Text dimColor>
          Filter: {state.findingsFilter.severities?.join(', ') ?? 'all'}
        </Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      {/* Column headers */}
      <Box paddingX={1}>
        <Box width={8}><Text bold dimColor>SEVER</Text></Box>
        <Box flexGrow={1}>
          <Text bold dimColor>CVE / Title</Text>
          {hasFilter && <Text color="cyan"> ●</Text>}
        </Box>
        <Box width={16}><Text bold dimColor>Repo</Text></Box>
        <Box width={12}><Text bold dimColor>Date</Text></Box>
      </Box>

      {/* Findings rows */}
      {pageFindings.map((finding, i) => {
        const isSelected = i === cursorIndex
        const isDetailSelected = finding.id === state.selectedFindingId
        const color = severityColor(finding.severity)
        const repoDisplay = finding.repo_nickname ?? finding.repo_id

        return (
          <Box key={finding.id} paddingX={1}>
            <Box width={8}>
              <Text color={color} bold inverse={isSelected}>{severityBadge(finding.severity)}</Text>
            </Box>
            <Box flexGrow={1}>
              <Text inverse={isSelected}>
                {truncate(finding.cve ? `${finding.cve} ${finding.title}` : finding.title, 40)}
              </Text>
            </Box>
            <Box width={16}>
              <Text dimColor={!isSelected} inverse={isSelected}>{truncate(repoDisplay, 15)}</Text>
            </Box>
            <Box width={12}>
              <Text dimColor={!isSelected} inverse={isSelected}>{formatDate(finding.date)}</Text>
            </Box>
            {isDetailSelected && <Text color="cyan"> ◀</Text>}
          </Box>
        )
      })}

      {/* Pagination indicator */}
      <Box paddingX={1} marginTop={1}>
        <Text dimColor>
          Page {state.findingsPage + 1}/{state.findingsPageCount} — {state.findingsTotal} total findings
          {state.findingsPageCount > 1 ? ' (] next, [ prev)' : ''}
        </Text>
      </Box>

      {/* Action hints */}
      <Box paddingX={1}>
        <Text dimColor>[Enter]detail [r]emediate [s]uppress [f]alse-pos [F]filter [c]hat [/]search [?]help</Text>
      </Box>
    </Box>
  )
}
