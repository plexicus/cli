import React from 'react'
import { Text } from 'ink'
import { useAnimationFrame } from '../../hooks/useAnimationFrame.js'

const FRAMES = ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷']

interface SpinnerProps {
  label?: string
  interval?: number
}

export function Spinner({ label, interval = 80 }: SpinnerProps) {
  const frame = useAnimationFrame(interval)
  const icon = FRAMES[frame % FRAMES.length]

  return (
    <Text>
      <Text color="cyan">{icon}</Text>
      {label ? <Text> {label}</Text> : null}
    </Text>
  )
}
