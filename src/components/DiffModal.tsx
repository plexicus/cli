import React from 'react'
import { Box, Text, useInput } from 'ink'
import { useAppState } from '../state/AppState.js'
import { accent } from '../utils/theme.js'
import { useRemediation } from '../hooks/useRemediation.js'
import { parseDiff } from '../utils/diff.js'
import { Spinner } from './design-system/Spinner.js'
import type { Finding } from '../types.js'

interface DiffModalProps {
  finding: Finding
  onClose: () => void
}

export function DiffModal({ finding, onClose }: DiffModalProps) {
  const { state } = useAppState()
  const ac = accent(state.theme)
  const { remediation, trigger, applyPR, prUrl } = useRemediation(finding.id)

  React.useEffect(() => {
    if (!remediation) {
      trigger()
    }
  }, [finding.id])

  React.useEffect(() => {
    const job = state.activeStatusJob
    if (
      job?.type === 'remediation' &&
      (job.status === 'ready' || job.status === 'done') &&
      (job.id === finding.id || job.id === remediation?.id)
    ) {
      trigger()
    }
  }, [state.activeStatusJob?.status])

  React.useEffect(() => {
    if (!prUrl) return
    const t = setTimeout(onClose, 1500)
    return () => clearTimeout(t)
  }, [prUrl])

  useInput((input, key) => {
    if (state.inputMode !== 'navigation') return
    if (key.escape) { onClose(); return }
    if (input === 'p' && remediation?.status === 'ready') {
      applyPR()
      return
    }
  })

  const isPending = !remediation || remediation.status === 'pending'
  const isReady = remediation?.status === 'ready'
  const diffLines = isReady && remediation.diff ? parseDiff(remediation.diff) : []

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1} flexGrow={1}>
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

      <Box marginTop={1} paddingX={1}>
        {isReady ? (
          <Text dimColor>p=create PR  Esc=close</Text>
        ) : (
          <Text dimColor>Esc=cancel</Text>
        )}
      </Box>
    </Box>
  )
}
