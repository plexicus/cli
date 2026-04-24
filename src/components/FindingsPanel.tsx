import React, { useState, useCallback, useEffect } from 'react'
import { Box, Text } from 'ink'
import { useAppState } from '../state/AppState.js'
import { useKeymap } from '../hooks/useKeymap.js'
import { useFindings } from '../hooks/useFindings.js'
import { Spinner } from './design-system/Spinner.js'
import { FuzzyPicker } from './design-system/FuzzyPicker.js'
import { severityBadge, severityColor } from '../utils/severity.js'
import type { Finding } from '../types.js'

const PAGE_SIZE = 20

interface FindingsPanelProps {
  repo?: string
  cve?: string
}

function formatDate(dateStr: string): string {
  return dateStr.slice(0, 10)
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

export function FindingsPanel({ repo, cve }: FindingsPanelProps) {
  const { state, dispatch } = useAppState()
  const { findings, loading } = useFindings({ repo, cve })
  const [page, setPage] = useState(0)
  const [cursorIndex, setCursorIndex] = useState(0)

  // Reset cursor and page whenever the filter changes so the list stays coherent
  useEffect(() => {
    setPage(0)
    setCursorIndex(0)
  }, [state.findingsFilter])

  const pageCount = Math.ceil(findings.length / PAGE_SIZE)
  const pageFindings = findings.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handleDown = useCallback(() => {
    setCursorIndex(i => {
      if (i < pageFindings.length - 1) return i + 1
      if (page < pageCount - 1) {
        setPage(p => p + 1)
        return 0
      }
      return i
    })
  }, [pageFindings.length, page, pageCount])

  const handleUp = useCallback(() => {
    setCursorIndex(i => {
      if (i > 0) return i - 1
      if (page > 0) {
        setPage(p => p - 1)
        return PAGE_SIZE - 1
      }
      return i
    })
  }, [page])

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
    // Remediation triggered from DetailPane
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
      const newStatus = finding.status === 'false_positive' ? 'open' as const : 'false_positive' as const
      const updated = { ...finding, status: newStatus }
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
      onNextPage: () => setPage(p => Math.min(p + 1, pageCount - 1)),
      onPrevPage: () => setPage(p => Math.max(p - 1, 0)),
    },
    { inputMode: state.inputMode, isActive: state.activePanel === 'findings' },
  )

  if (state.fuzzyOpen && state.activePanel === 'findings') {
    return (
      <FuzzyPicker
        items={findings}
        getLabel={f => `${f.name} (${f.repo})`}
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
          {state.findingsFilter.repo ? ` | repo: ${state.findingsFilter.repo}` : ''}
        </Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      {/* Column headers */}
      <Box paddingX={1}>
        <Box width={8}><Text bold dimColor>SEVER</Text></Box>
        <Box flexGrow={1}><Text bold dimColor>CVE / Name</Text></Box>
        <Box width={16}><Text bold dimColor>Repo</Text></Box>
        <Box width={12}><Text bold dimColor>Date</Text></Box>
      </Box>

      {/* Findings rows */}
      {pageFindings.map((finding, i) => {
        const isSelected = i === cursorIndex
        const isDetailSelected = finding.id === state.selectedFindingId
        const color = severityColor(finding.severity)

        return (
          <Box key={finding.id} paddingX={1}>
            <Box width={8}>
              <Text color={color} bold inverse={isSelected}>{severityBadge(finding.severity)}</Text>
            </Box>
            <Box flexGrow={1}>
              <Text inverse={isSelected}>
                {truncate(finding.cve_id ? `${finding.cve_id} ${finding.name}` : finding.name, 40)}
              </Text>
            </Box>
            <Box width={16}>
              <Text dimColor={!isSelected} inverse={isSelected}>{truncate(finding.repo, 15)}</Text>
            </Box>
            <Box width={12}>
              <Text dimColor={!isSelected} inverse={isSelected}>{formatDate(finding.created_at)}</Text>
            </Box>
            {isDetailSelected && <Text color="cyan"> ◀</Text>}
          </Box>
        )
      })}

      {/* Pagination indicator */}
      <Box paddingX={1} marginTop={1}>
        <Text dimColor>
          {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, findings.length)} of {findings.length} findings
          {pageCount > 1 ? ` (page ${page + 1}/${pageCount} — ] next, [ prev)` : ''}
        </Text>
      </Box>

      {/* Action hints */}
      <Box paddingX={1}>
        <Text dimColor>[Enter]detail [r]emediate [s]uppress [f]alse-pos [c]hat [/]search [?]help</Text>
      </Box>
    </Box>
  )
}
