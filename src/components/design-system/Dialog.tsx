import React from 'react'
import { Box, Text } from 'ink'

interface DialogProps {
  title: string
  children: React.ReactNode
  width?: number
  accentColor?: string
}

export function Dialog({ title, children, width = 60, accentColor = '#9241ff' }: DialogProps) {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={accentColor}
      width={width}
      paddingX={1}
    >
      <Text bold color={accentColor}>{title}</Text>
      <Box marginTop={1} flexDirection="column">{children}</Box>
    </Box>
  )
}
