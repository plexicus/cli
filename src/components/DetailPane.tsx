import React from 'react'
import { Box, Text, useInput } from 'ink'
import { useAppState } from '../state/AppState.js'
import { severityBadge, severityColor, cvssColor } from '../utils/severity.js'
import type { Finding } from '../types.js'

function statusLabel(finding: Finding): string {
  if (finding.is_false_positive) return '⊘ false positive'
  switch (finding.status) {
    case 'open': return 'open'
    case 'mitigated': return '✓ mitigated'
    case 'enriched': return '⊕ enriched'
  }
}

function statusColor(finding: Finding): string {
  if (finding.is_false_positive) return 'gray'
  switch (finding.status) {
    case 'open': return 'yellow'
    case 'mitigated': return 'green'
    case 'enriched': return 'cyan'
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
    if (input === 'r') { onRemediate?.(finding); return }
    if (input === 'p') { onPR?.(finding); return }
    if (input === 's') { onSuppress?.(finding); return }
    if (input === 'f') { onFalsePositive?.(finding); return }
  })

  if (!finding) return null

  const sevColor = severityColor(finding.severity)
  const cvssScore = finding.cvssv3_score

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
        <Text bold>{finding.title}</Text>
      </Box>

      {/* CVE + CVSS + status row */}
      <Box marginTop={1}>
        {finding.cve && (
          <Box marginRight={2}>
            <Text dimColor>CVE: </Text>
            <Text color="cyan">{finding.cve}</Text>
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
        <Box marginRight={2}>
          <Text dimColor>Status: </Text>
          <Text color={statusColor(finding)}>{statusLabel(finding)}</Text>
        </Box>
        {finding.prioritization_value !== null && (
          <Box>
            <Text dimColor>Priority: </Text>
            <Text>{finding.prioritization_value}</Text>
          </Box>
        )}
      </Box>

      {/* Repo row */}
      <Box>
        <Text dimColor>Repo: </Text>
        <Text>{finding.repo_nickname ?? finding.repo_id}</Text>
        {finding.type && (
          <>
            <Text dimColor>  Type: </Text>
            <Text>{finding.type}</Text>
          </>
        )}
      </Box>

      {/* CWE + EPSS */}
      {(finding.cwe !== null || finding.estimated_epss !== null) && (
        <Box>
          {finding.cwe !== null && (
            <Box marginRight={2}>
              <Text dimColor>CWE: </Text>
              <Text>{finding.cwe}</Text>
            </Box>
          )}
          {finding.estimated_epss !== null && (
            <Box>
              <Text dimColor>EPSS: </Text>
              <Text>{(finding.estimated_epss * 100).toFixed(2)}%</Text>
            </Box>
          )}
        </Box>
      )}

      {/* File + line */}
      {finding.file_path && (
        <Box>
          <Text dimColor>File: </Text>
          <Text color="blue">{finding.file_path}</Text>
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
