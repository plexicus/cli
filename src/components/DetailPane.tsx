import React from 'react'
import { Box, Text, useInput } from 'ink'
import { useAppState } from '../state/AppState.js'
import { severityBadge, severityColor, cvssColor } from '../utils/severity.js'
import type { Finding } from '../types.js'

function statusLabel(status: Finding['status']): string {
  switch (status) {
    case 'open': return 'open'
    case 'mitigated': return '✓ mitigated'
    case 'false_positive': return '⊘ false positive'
  }
}

function statusColor(status: Finding['status']): string {
  switch (status) {
    case 'open': return 'yellow'
    case 'mitigated': return 'green'
    case 'false_positive': return 'gray'
  }
}

interface DetailPaneProps {
  onRemediate?: (finding: Finding) => void
  onPR?: (finding: Finding) => void
  onSuppress?: (finding: Finding) => void
  onFalsePositive?: (finding: Finding) => void
}

export function DetailPane({ onRemediate, onPR, onSuppress, onFalsePositive }: DetailPaneProps) {
  const { state, dispatch } = useAppState()

  const finding = state.selectedFindingId
    ? state.findings.find(f => f.id === state.selectedFindingId) ?? null
    : null

  useInput((input, key) => {
    if (!finding) return
    if (state.inputMode !== 'navigation') return

    if (key.escape) {
      dispatch({ type: 'findings/select', payload: null })
      return
    }
    if (input === 'r') {
      onRemediate?.(finding)
      return
    }
    if (input === 'p') {
      onPR?.(finding)
      return
    }
    if (input === 's') {
      onSuppress?.(finding)
      return
    }
    if (input === 'f') {
      onFalsePositive?.(finding)
      return
    }
  })

  if (!finding) return null

  const sevColor = severityColor(finding.severity)
  const cvssScore = finding.cvss_score

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
      paddingY={0}
      marginTop={1}
    >
      {/* Title row */}
      <Box>
        <Text color={sevColor} bold>{severityBadge(finding.severity)}</Text>
        <Text> </Text>
        <Text bold>{finding.name}</Text>
      </Box>

      {/* CVE + CVSS row */}
      <Box marginTop={1}>
        {finding.cve_id && (
          <Box marginRight={2}>
            <Text dimColor>CVE: </Text>
            <Text color="cyan">{finding.cve_id}</Text>
          </Box>
        )}
        <Box marginRight={2}>
          <Text dimColor>CVSS: </Text>
          {cvssScore !== null ? (
            <Text color={cvssColor(cvssScore)} bold>{cvssScore.toFixed(1)}</Text>
          ) : (
            <Text dimColor>N/A</Text>
          )}
        </Box>
        <Box>
          <Text dimColor>Status: </Text>
          <Text color={statusColor(finding.status)}>{statusLabel(finding.status)}</Text>
        </Box>
      </Box>

      {/* Repo row */}
      <Box>
        <Text dimColor>Repo: </Text>
        <Text>{finding.repo}</Text>
      </Box>

      {/* File + line */}
      {finding.file && (
        <Box>
          <Text dimColor>File: </Text>
          <Text color="blue">{finding.file}</Text>
          {finding.line !== null && (
            <>
              <Text dimColor>:</Text>
              <Text color="blue">{finding.line}</Text>
            </>
          )}
        </Box>
      )}

      {/* Description */}
      {finding.description && (
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>Description:</Text>
          <Text wrap="wrap">{finding.description}</Text>
        </Box>
      )}

      {/* Actions footer */}
      <Box marginTop={1} borderStyle="single" borderColor="gray">
        <Text dimColor>[r]emediate  </Text>
        <Text dimColor>[p]R  </Text>
        <Text dimColor>[s]uppress  </Text>
        <Text dimColor>[f]alse-positive  </Text>
        <Text dimColor>[Esc]close</Text>
      </Box>
    </Box>
  )
}
