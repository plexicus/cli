import React from 'react'
import { Box, Text, useInput } from 'ink'
import { useAppState } from '../state/AppState.js'
import { useRemediation } from '../hooks/useRemediation.js'
import { parseDiff } from '../utils/diff.js'
import { Spinner } from './design-system/Spinner.js'
import type { Finding } from '../types.js'

interface DiffViewProps {
  finding: Finding
  onClose: () => void
}

export function DiffView({ finding, onClose }: DiffViewProps) {
  const { state } = useAppState()
  const { remediation, trigger, applyPR } = useRemediation(finding.id)

  // Auto-trigger if no remediation yet
  React.useEffect(() => {
    if (!remediation) {
      trigger()
    }
  }, [finding.id])

  useInput((input, key) => {
    if (state.inputMode !== 'navigation') return
    if (key.escape) {
      onClose()
      return
    }
    if (input === 'p' && remediation?.status === 'ready') {
      applyPR()
      return
    }
  })

  const isPending = !remediation || remediation.status === 'pending'
  const isReady = remediation?.status === 'ready'
  const diffLines = isReady && remediation.diff ? parseDiff(remediation.diff) : []

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
      {/* Header */}
      <Box>
        <Text bold color="yellow">AI Remediation</Text>
        <Text dimColor> — {finding.title}</Text>
      </Box>

      {isPending && (
        <Box marginTop={1}>
          <Spinner label="Generating remediation..." interval={120} />
        </Box>
      )}

      {isReady && diffLines.length === 0 && (
        <Box marginTop={1}>
          <Text color="yellow">No diff available for this remediation</Text>
        </Box>
      )}

      {isReady && diffLines.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          {diffLines.map((line, i) => {
            switch (line.type) {
              case 'add':
                return <Text key={i} color="green">+ {line.content}</Text>
              case 'remove':
                return <Text key={i} color="red">- {line.content}</Text>
              case 'header':
                return <Text key={i} dimColor>{line.content}</Text>
              case 'context':
                return <Text key={i} dimColor>  {line.content}</Text>
            }
          })}
        </Box>
      )}

      {/* Footer */}
      <Box marginTop={1} borderStyle="single" borderColor="gray">
        {isReady ? (
          <Text dimColor>[p]create PR  [Esc]close</Text>
        ) : (
          <Text dimColor>[Esc]cancel</Text>
        )}
      </Box>
    </Box>
  )
}
