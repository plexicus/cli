import React, { useState, useCallback } from 'react'
import { Box, Text, useInput } from 'ink'
import TextInput from 'ink-text-input'

interface FuzzyPickerProps<T> {
  items: T[]
  getLabel: (item: T) => string
  onSelect: (item: T) => void
  onCancel: () => void
  placeholder?: string
  accentColor?: string
}

export function FuzzyPicker<T>({
  items,
  getLabel,
  onSelect,
  onCancel,
  placeholder = 'Search...',
  accentColor = '#9241ff',
}: FuzzyPickerProps<T>) {
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)

  const filtered = query
    ? items.filter(item => getLabel(item).toLowerCase().includes(query.toLowerCase()))
    : items

  const visible = filtered.slice(0, 10)

  const handleChange = useCallback((val: string) => {
    setQuery(val)
    setCursor(0)
  }, [])

  useInput((_, key) => {
    if (key.escape) { onCancel(); return }
    if (key.downArrow) { setCursor(c => Math.min(c + 1, visible.length - 1)); return }
    if (key.upArrow) { setCursor(c => Math.max(c - 1, 0)); return }
  })

  const handleSubmit = useCallback(() => {
    const selected = visible[cursor]
    if (selected) onSelect(selected)
    else onCancel()
  }, [visible, cursor, onSelect, onCancel])

  return (
    <Box flexDirection="column" borderStyle="bold" borderColor={accentColor} paddingX={1}>
      <Box>
        <Text color={accentColor}>/ </Text>
        <TextInput
          value={query}
          onChange={handleChange}
          onSubmit={handleSubmit}
          placeholder={placeholder}
        />
      </Box>
      <Text dimColor>
        {visible.length}/{items.length} results  [↑↓]navigate [Enter]select [Esc]cancel
      </Text>
      {visible.map((item, i) => (
        <Text key={i} inverse={i === cursor}>
          {i === cursor ? '▶ ' : '  '}
          {getLabel(item)}
        </Text>
      ))}
    </Box>
  )
}
