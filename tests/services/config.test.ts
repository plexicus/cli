import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { ConfigSchema } from '../../src/services/config.js'

describe('ConfigSchema', () => {
  it('provides defaults', () => {
    const config = ConfigSchema.parse({})
    expect(config.serverUrl).toBe('https://api.app.plexicus.ai')
    expect(config.theme).toBe('dark')
    expect(config.llm).toEqual({})
  })

  it('accepts valid config', () => {
    const config = ConfigSchema.parse({
      serverUrl: 'https://custom.example.com',
      token: 'sk-test',
      llm: { provider: 'claude', apiKey: 'key-123' },
      theme: 'light',
    })
    expect(config.serverUrl).toBe('https://custom.example.com')
    expect(config.token).toBe('sk-test')
    expect(config.theme).toBe('light')
  })

  it('rejects invalid serverUrl', () => {
    expect(() => ConfigSchema.parse({ serverUrl: 'not-a-url' })).toThrow()
  })

  it('rejects invalid theme', () => {
    expect(() => ConfigSchema.parse({ theme: 'pink' })).toThrow()
  })

  it('rejects invalid llm provider', () => {
    expect(() => ConfigSchema.parse({ llm: { provider: 'gemini' } })).toThrow()
  })
})

describe('setConfigValue key normalization', () => {
  let tmpDir: string
  let origHome: string | undefined

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'plexicus-test-'))
    origHome = process.env.HOME
    process.env.HOME = tmpDir
  })

  afterEach(async () => {
    process.env.HOME = origHome
    await rm(tmpDir, { recursive: true, force: true })
  })

  it('normalizes llm.api_key → llm.apiKey', async () => {
    const { setConfigValue } = await import('../../src/services/config.js')
    const result = await setConfigValue('llm.api_key', 'sk-test-key')
    expect(result.llm.apiKey).toBe('sk-test-key')
  })

  it('normalizes llm.base_url → llm.baseUrl', async () => {
    const { setConfigValue } = await import('../../src/services/config.js')
    const result = await setConfigValue('llm.base_url', 'https://api.example.com')
    expect(result.llm.baseUrl).toBe('https://api.example.com')
  })

  it('sets llm.provider directly', async () => {
    const { setConfigValue } = await import('../../src/services/config.js')
    const result = await setConfigValue('llm.provider', 'openai')
    expect(result.llm.provider).toBe('openai')
  })

  it('sets serverUrl directly', async () => {
    const { setConfigValue } = await import('../../src/services/config.js')
    const result = await setConfigValue('serverUrl', 'https://self-hosted.example.com')
    expect(result.serverUrl).toBe('https://self-hosted.example.com')
  })

  it('rejects invalid provider via setConfigValue', async () => {
    const { setConfigValue } = await import('../../src/services/config.js')
    await expect(setConfigValue('llm.provider', 'gemini')).rejects.toThrow()
  })
})
