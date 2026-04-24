import React from 'react'
import { Box, type BoxProps } from 'ink'

type Theme = 'dark' | 'light'
type Variant = 'primary' | 'secondary' | 'danger'

const BORDER_COLORS: Record<Theme, Record<Variant, string>> = {
  dark: { primary: 'cyan', secondary: 'gray', danger: 'red' },
  light: { primary: 'blue', secondary: 'gray', danger: 'red' },
}

interface ThemedBoxProps extends BoxProps {
  theme?: Theme
  variant?: Variant
}

export function ThemedBox({ theme = 'dark', variant = 'primary', borderStyle, ...props }: ThemedBoxProps) {
  const borderColor = BORDER_COLORS[theme][variant]
  return (
    <Box
      borderStyle={borderStyle ?? 'round'}
      borderColor={borderColor}
      {...props}
    />
  )
}
