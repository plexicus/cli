import { useInput } from 'ink'
import { useRef } from 'react'
import type { InputMode } from '../types.js'

export interface KeymapHandlers {
  onDown?: () => void
  onUp?: () => void
  onGG?: () => void          // vim gg — jump to top
  onShiftG?: () => void      // vim G — jump to bottom
  onSelect?: () => void      // Enter
  onEscape?: () => void      // Esc
  onRemediate?: () => void   // r
  onPR?: () => void          // p
  onSuppress?: () => void    // s
  onFalsePositive?: () => void // f
  onNextPage?: () => void    // ]
  onPrevPage?: () => void    // [
}

interface UseKeymapOptions {
  inputMode: InputMode
  isActive?: boolean
}

const GG_TIMEOUT_MS = 500

export function useKeymap(handlers: KeymapHandlers, { inputMode, isActive = true }: UseKeymapOptions) {
  const gPressedAt = useRef<number | null>(null)

  useInput((input, key) => {
    if (!isActive) return
    // Only process navigation keys when in navigation mode
    if (inputMode !== 'navigation') return

    if (input === 'j' || key.downArrow) {
      gPressedAt.current = null
      handlers.onDown?.()
      return
    }

    if (input === 'k' || key.upArrow) {
      gPressedAt.current = null
      handlers.onUp?.()
      return
    }

    if (input === 'G') {
      gPressedAt.current = null
      handlers.onShiftG?.()
      return
    }

    if (input === 'g') {
      const now = Date.now()
      const prev = gPressedAt.current
      if (prev !== null && now - prev < GG_TIMEOUT_MS) {
        gPressedAt.current = null
        handlers.onGG?.()
      } else {
        gPressedAt.current = now
      }
      return
    }

    // Reset gg timer on any other key
    gPressedAt.current = null

    if (key.return) {
      handlers.onSelect?.()
      return
    }

    if (key.escape) {
      handlers.onEscape?.()
      return
    }

    if (input === 'r') {
      handlers.onRemediate?.()
      return
    }

    if (input === 'p') {
      handlers.onPR?.()
      return
    }

    if (input === 's') {
      handlers.onSuppress?.()
      return
    }

    if (input === 'f') {
      handlers.onFalsePositive?.()
      return
    }

    if (input === ']') {
      handlers.onNextPage?.()
      return
    }

    if (input === '[') {
      handlers.onPrevPage?.()
      return
    }
  })
}
