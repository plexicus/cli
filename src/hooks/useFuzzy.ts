import { useState, useMemo } from 'react'

export function useFuzzy<T>(items: T[], getKey: (item: T) => string) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query) return items
    const lower = query.toLowerCase()
    return items.filter(item => getKey(item).toLowerCase().includes(lower))
  }, [items, query, getKey])

  return { query, setQuery, filtered }
}
