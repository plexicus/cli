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
  ['F', 'Open filter modal'],
  ['] / [', 'Next / prev page'],
  ['/', 'Fuzzy search (findings only)'],
  [':', 'Open command REPL'],
  ['/?', 'Help from REPL'],
  ['c', 'Toggle AI chat sidebar'],
  [':ask / :a', 'Ask AI a question'],
  [':filter sev:h', 'Filter by severity (REPL)'],
  [':config set k v', 'Set a config value'],
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
          <Box width={16}>
            <Text color="cyan" bold>{key}</Text>
          </Box>
          <Text>{desc}</Text>
        </Box>
      ))}
    </Dialog>
  )
}
