import React, { useState, useCallback } from 'react'
import { Box, Text } from 'ink'
import { useAppState } from '../state/AppState.js'
import { useKeymap } from '../hooks/useKeymap.js'
import { useRepos } from '../hooks/useRepos.js'
import { Spinner } from './design-system/Spinner.js'

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

export function ReposPanel() {
  const { state, dispatch } = useAppState()
  const { repos, loading } = useRepos()
  const [cursorIndex, setCursorIndex] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleDown = useCallback(() => {
    setCursorIndex(i => Math.min(i + 1, repos.length - 1))
  }, [repos.length])

  const handleUp = useCallback(() => {
    setCursorIndex(i => Math.max(i - 1, 0))
  }, [])

  const handleSelect = useCallback(() => {
    const repo = repos[cursorIndex]
    if (!repo) return
    setExpandedId(id => id === repo.id ? null : repo.id)
  }, [repos, cursorIndex])

  const handleEscape = useCallback(() => {
    if (expandedId) {
      setExpandedId(null)
    } else {
      dispatch({ type: 'ui/setPanel', payload: 'findings' })
    }
  }, [expandedId, dispatch])

  useKeymap(
    {
      onDown: handleDown,
      onUp: handleUp,
      onSelect: handleSelect,
      onEscape: handleEscape,
    },
    { inputMode: state.inputMode, isActive: state.activePanel === 'repos' },
  )

  if (loading) {
    return (
      <Box flexDirection="column" padding={1}>
        <Spinner label="Loading repositories..." />
      </Box>
    )
  }

  if (repos.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="yellow">No repositories found</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column">
      {/* Column headers */}
      <Box paddingX={1}>
        <Box width={20}><Text bold dimColor>Nickname</Text></Box>
        <Box flexGrow={1}><Text bold dimColor>URI</Text></Box>
        <Box width={12}><Text bold dimColor>Source</Text></Box>
        <Box width={10}><Text bold dimColor>Findings</Text></Box>
      </Box>

      {repos.map((repo, i) => {
        const isSelected = i === cursorIndex
        const isExpanded = repo.id === expandedId

        return (
          <Box key={repo.id} flexDirection="column">
            <Box paddingX={1}>
              <Box width={20}>
                <Text bold={isSelected} inverse={isSelected}>
                  {truncate(repo.nickname, 19)}
                </Text>
              </Box>
              <Box flexGrow={1}>
                <Text dimColor={!isSelected} inverse={isSelected}>{truncate(repo.uri, 35)}</Text>
              </Box>
              <Box width={12}>
                <Text dimColor={!isSelected} inverse={isSelected}>{repo.source_control}</Text>
              </Box>
              <Box width={10}>
                <Text dimColor={!isSelected} inverse={isSelected}>
                  {repo.finding_counts.critical > 0 && <Text color="red">{repo.finding_counts.critical}C </Text>}
                  {repo.finding_counts.high > 0 && <Text color="yellow">{repo.finding_counts.high}H</Text>}
                  {repo.finding_counts.critical === 0 && repo.finding_counts.high === 0 && (
                    <Text dimColor>{repo.finding_counts.total}</Text>
                  )}
                </Text>
              </Box>
            </Box>

            {isExpanded && (
              <Box paddingX={3} paddingY={1} flexDirection="column">
                <Text dimColor>URI: {repo.uri}</Text>
                <Text dimColor>Source Control: {repo.source_control}</Text>
                <Text dimColor>Status: {repo.status}{repo.active ? '' : ' (inactive)'}</Text>
                <Box marginTop={1}>
                  <Text dimColor>Findings: </Text>
                  <Text color="red">{repo.finding_counts.critical}C </Text>
                  <Text color="yellow">{repo.finding_counts.high}H </Text>
                  <Text color="blue">{repo.finding_counts.medium}M </Text>
                  <Text dimColor>{repo.finding_counts.low}L</Text>
                </Box>
                <Box marginTop={1}>
                  <Text dimColor>[Esc] collapse</Text>
                </Box>
              </Box>
            )}
          </Box>
        )
      })}

      {/* Footer */}
      <Box paddingX={1} marginTop={1}>
        <Text dimColor>[Enter]expand [Esc]back [1]findings [?]help</Text>
      </Box>
    </Box>
  )
}
