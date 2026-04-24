import { useState, useEffect } from 'react'

export function useAnimationFrame(interval: number): number {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setFrame(f => f + 1)
    }, interval)
    return () => clearInterval(id)
  }, [interval])

  return frame
}
