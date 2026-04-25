import React, { useEffect, useState } from 'react'
import { Text, useInput } from 'ink'

interface SmartTextInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit?: (value: string) => void
  placeholder?: string
  mask?: string
  focus?: boolean
}

export function SmartTextInput({
  value,
  onChange,
  onSubmit,
  placeholder = '',
  mask,
  focus = true,
}: SmartTextInputProps) {
  const [cursor, setCursor] = useState(value.length)

  useEffect(() => {
    setCursor(c => Math.min(c, value.length))
  }, [value.length])

  useInput((input, key) => {
    if (!focus) return

    if (key.leftArrow) { setCursor(c => Math.max(0, c - 1)); return }
    if (key.rightArrow) { setCursor(c => Math.min(value.length, c + 1)); return }

    // readline shortcuts
    if (key.ctrl && input === 'a') { setCursor(0); return }
    if (key.ctrl && input === 'e') { setCursor(value.length); return }
    if (key.ctrl && (input === 'u' || input === 'k')) {
      // Ctrl+U: clear to beginning from cursor; Ctrl+K: clear to end
      // Without true cursor-aware editing we treat both as clear-all for simplicity
      onChange('')
      setCursor(0)
      return
    }
    if (key.ctrl && input === 'w') {
      const before = value.slice(0, cursor)
      const trimmed = before.trimEnd()
      const lastSpace = trimmed.lastIndexOf(' ')
      const newBefore = lastSpace >= 0 ? trimmed.slice(0, lastSpace + 1) : ''
      onChange(newBefore + value.slice(cursor))
      setCursor(newBefore.length)
      return
    }

    if (key.backspace || key.delete) {
      if (cursor > 0) {
        onChange(value.slice(0, cursor - 1) + value.slice(cursor))
        setCursor(c => c - 1)
      }
      return
    }
    if (key.return) {
      onSubmit?.(value)
      return
    }
    if (!key.ctrl && !key.meta && input && input.length === 1) {
      const next = value.slice(0, cursor) + input + value.slice(cursor)
      onChange(next)
      setCursor(c => c + 1)
    }
  })

  const display = mask ? mask.repeat(value.length) : value

  if (!focus && !value) {
    return <Text dimColor>{placeholder}</Text>
  }

  if (!value) {
    return (
      <Text>
        <Text inverse> </Text>
        {placeholder && <Text dimColor>{placeholder}</Text>}
      </Text>
    )
  }

  const before = display.slice(0, cursor)
  const atChar = display[cursor]
  const after = display.slice(cursor + 1)

  return (
    <Text>
      {before}
      {atChar !== undefined
        ? <Text inverse>{atChar}</Text>
        : <Text inverse> </Text>}
      {after}
    </Text>
  )
}
