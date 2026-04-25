import { describe, it, expect, beforeEach, afterEach } from 'bun:test'

// Save original values
const origSSH_TTY = process.env.SSH_TTY
const origDISPLAY = process.env.DISPLAY
const origWAYLAND = process.env.WAYLAND_DISPLAY
const origPlatform = process.platform

function setPlatform(p: string) {
  Object.defineProperty(process, 'platform', { value: p, configurable: true })
}

function restore() {
  Object.defineProperty(process, 'platform', { value: origPlatform, configurable: true })
  if (origSSH_TTY === undefined) delete process.env.SSH_TTY
  else process.env.SSH_TTY = origSSH_TTY
  if (origDISPLAY === undefined) delete process.env.DISPLAY
  else process.env.DISPLAY = origDISPLAY
  if (origWAYLAND === undefined) delete process.env.WAYLAND_DISPLAY
  else process.env.WAYLAND_DISPLAY = origWAYLAND
}

describe('canOpenBrowser', () => {
  afterEach(restore)

  it('returns false when SSH_TTY is set', async () => {
    process.env.SSH_TTY = '/dev/pts/0'
    delete process.env.DISPLAY
    setPlatform('linux')
    const { canOpenBrowser } = await import('../../src/utils/canOpenBrowser.js')
    expect(canOpenBrowser()).toBe(false)
  })

  it('returns true on darwin without SSH_TTY', async () => {
    delete process.env.SSH_TTY
    setPlatform('darwin')
    const { canOpenBrowser } = await import('../../src/utils/canOpenBrowser.js')
    expect(canOpenBrowser()).toBe(true)
  })

  it('returns false on linux with no DISPLAY or WAYLAND_DISPLAY', async () => {
    delete process.env.SSH_TTY
    delete process.env.DISPLAY
    delete process.env.WAYLAND_DISPLAY
    setPlatform('linux')
    const { canOpenBrowser } = await import('../../src/utils/canOpenBrowser.js')
    expect(canOpenBrowser()).toBe(false)
  })

  it('returns true on linux with DISPLAY set', async () => {
    delete process.env.SSH_TTY
    process.env.DISPLAY = ':0'
    delete process.env.WAYLAND_DISPLAY
    setPlatform('linux')
    const { canOpenBrowser } = await import('../../src/utils/canOpenBrowser.js')
    expect(canOpenBrowser()).toBe(true)
  })

  it('returns true on linux with WAYLAND_DISPLAY set', async () => {
    delete process.env.SSH_TTY
    delete process.env.DISPLAY
    process.env.WAYLAND_DISPLAY = 'wayland-0'
    setPlatform('linux')
    const { canOpenBrowser } = await import('../../src/utils/canOpenBrowser.js')
    expect(canOpenBrowser()).toBe(true)
  })
})
