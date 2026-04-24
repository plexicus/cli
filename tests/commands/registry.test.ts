import { describe, it, expect } from 'bun:test'
import { findCommand, getAllCommands } from '../../src/commands.js'

describe('command registry', () => {
  it('finds ask command by name', async () => {
    const cmd = await findCommand('ask')
    expect(cmd).toBeDefined()
    expect(cmd?.name).toBe('ask')
  })

  it('finds ask command by alias', async () => {
    const cmd = await findCommand('a')
    expect(cmd).toBeDefined()
    expect(cmd?.name).toBe('ask')
  })

  it('returns undefined for unknown command', async () => {
    const cmd = await findCommand('nonexistent-cmd-xyz')
    expect(cmd).toBeUndefined()
  })

  it('getAllCommands returns all registered commands', async () => {
    const cmds = await getAllCommands()
    expect(Array.isArray(cmds)).toBe(true)
    expect(cmds.length).toBeGreaterThanOrEqual(4)
    const names = cmds.map(c => c.name)
    expect(names).toContain('ask')
    expect(names).toContain('theme')
    expect(names).toContain('filter')
    expect(names).toContain('config')
  })

  it('memoizes — returns same array on second call', async () => {
    const first = await getAllCommands()
    const second = await getAllCommands()
    expect(first).toBe(second) // same reference due to memoize
  })
})
