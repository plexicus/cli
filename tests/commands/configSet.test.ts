import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

describe('ConfigSetCommand', () => {
  let tmpDir: string
  let origHome: string | undefined

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'plexicus-configset-'))
    origHome = process.env.HOME
    process.env.HOME = tmpDir
  })

  afterEach(async () => {
    process.env.HOME = origHome
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('writes llm.provider and prints confirmation', async () => {
    const logs: string[] = []
    const origLog = console.log
    console.log = (...args: unknown[]) => logs.push(args.join(' '))

    const { default: ConfigSetCommand } = await import('../../src/commands/configSet.js')
    await ConfigSetCommand('llm.provider', 'claude')

    console.log = origLog
    expect(logs.some(l => l.includes('✓'))).toBe(true)
    expect(logs.some(l => l.includes('provider: claude'))).toBe(true)
  })

  it('shows masked api_key in output', async () => {
    const logs: string[] = []
    const origLog = console.log
    console.log = (...args: unknown[]) => logs.push(args.join(' '))

    const { default: ConfigSetCommand } = await import('../../src/commands/configSet.js')
    await ConfigSetCommand('llm.api_key', 'sk-secret')

    console.log = origLog
    expect(logs.some(l => l.includes('***'))).toBe(true)
    expect(logs.every(l => !l.includes('sk-secret'))).toBe(true)
  })

  it('persists value to config file', async () => {
    const { default: ConfigSetCommand } = await import('../../src/commands/configSet.js')
    await ConfigSetCommand('llm.provider', 'openai')

    const { loadConfig } = await import('../../src/services/config.js')
    const config = await loadConfig()
    expect(config.llm.provider).toBe('openai')
  })

  it('normalizes llm.api_key alias', async () => {
    const { default: ConfigSetCommand } = await import('../../src/commands/configSet.js')
    await ConfigSetCommand('llm.api_key', 'my-key')

    const { loadConfig } = await import('../../src/services/config.js')
    const config = await loadConfig()
    expect(config.llm.apiKey).toBe('my-key')
  })
})
