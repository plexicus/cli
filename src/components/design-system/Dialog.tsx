import React from 'react'
import { Box, Text } from 'ink'

interface DialogProps {
  title: string
  children: React.ReactNode
  width?: number
}

export function Dialog({ title, children, width = 60 }: DialogProps) {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      width={width}
      paddingX={1}
    >
      <Text bold color="cyan">{title}</Text>
      <Box marginTop={1} flexDirection="column">{children}</Box>
    </Box>
  )
}
