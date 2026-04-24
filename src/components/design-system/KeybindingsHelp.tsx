import React from 'react'
import { Box, Text, useInput } from 'ink'
import { Dialog } from './Dialog.js'

const KEYBINDINGS = [
  ['j / k', 'Navigate down / up'],
  ['gg / G', 'Jump to top / bottom'],
  ['Enter', 'Select / open detail'],
  ['Esc', 'Close / go back'],
  ['r', 'Request AI remediation'],
  ['p', 'Create pull request'],
  ['s', 'Mark as mitigated'],
  ['f', 'Toggle false positive'],
  ['] / [', 'Next / prev page'],
  ['/', 'Fuzzy search (findings only)'],
  [':', 'Open command REPL'],
  ['c', 'Toggle AI chat sidebar'],
  [':ask <q>', 'Ask AI a question'],
  [':filter sev:h', 'Filter by severity'],
  ['Tab / 1 / 2', 'Switch panels'],
  ['?', 'Show this help'],
]

interface KeybindingsHelpProps {
  onDismiss: () => void
}

export function KeybindingsHelp({ onDismiss }: KeybindingsHelpProps) {
  useInput(() => onDismiss())

  return (
    <Dialog title="Keybindings">
      {KEYBINDINGS.map(([key, desc]) => (
        <Box key={key}>
          <Box width={14}>
            <Text color="cyan" bold>{key}</Text>
          </Box>
          <Text>{desc}</Text>
        </Box>
      ))}
    </Dialog>
  )
}
