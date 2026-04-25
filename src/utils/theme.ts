export type Theme = 'dark' | 'light' | 'plexicus'

export function accent(theme: Theme): string {
  if (theme === 'plexicus') return '#9241ff'
  if (theme === 'light') return 'blue'
  return 'cyan'
}
