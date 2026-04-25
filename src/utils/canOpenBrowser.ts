export function canOpenBrowser(): boolean {
  if (process.env.SSH_TTY) return false
  if (process.platform === 'darwin') return true
  if (process.platform === 'linux') {
    if (!process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) return false
    return true
  }
  return true
}
