import { z } from 'zod'
import { mkdir, readFile, writeFile, chmod } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { set } from 'lodash-es'
import { getConfigDir, getConfigPath } from '../utils/paths.js'
import { PlexicusConfigError } from '../utils/errors.js'

const LLMConfigSchema = z.object({
  provider: z.enum(['claude', 'openai']).optional(),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  baseUrl: z.string().url().optional(),
})

export const ConfigSchema = z.object({
  serverUrl: z.string().url().default('https://api.app.plexicus.ai'),
  webUrl: z.string().url().optional(),
  wsUrl: z.string().optional(),
  token: z.string().optional(),
  llm: LLMConfigSchema.default({}),
  theme: z.enum(['dark', 'light', 'plexicus']).default('plexicus'),
})

export type Config = z.infer<typeof ConfigSchema>

export async function loadConfig(): Promise<Config> {
  const configPath = getConfigPath()
  if (!existsSync(configPath)) {
    return ConfigSchema.parse({})
  }
  try {
    const raw = await readFile(configPath, 'utf-8')
    const parsed = JSON.parse(raw)
    return ConfigSchema.parse(parsed)
  } catch {
    return ConfigSchema.parse({})
  }
}

export async function saveConfig(config: Config): Promise<void> {
  const configDir = getConfigDir()
  const configPath = getConfigPath()
  const tmpPath = configPath + '.tmp'

  await mkdir(configDir, { recursive: true, mode: 0o700 })
  await chmod(configDir, 0o700)
  await writeFile(tmpPath, JSON.stringify(config, null, 2), { encoding: 'utf-8', mode: 0o600 })
  await Bun.file(tmpPath).text() // ensure write is flushed
  // atomic rename
  const { rename } = await import('fs/promises')
  await rename(tmpPath, configPath)
  await chmod(configPath, 0o600)
}

export async function setConfigValue(key: string, value: string): Promise<Config> {
  const current = await loadConfig()
  // Normalize CLI key aliases: llm.api_key → llm.apiKey, llm.base_url → llm.baseUrl
  const normalizedKey = key
    .replace(/\.api_key$/, '.apiKey')
    .replace(/\.base_url$/, '.baseUrl')
  const updated = set({ ...current }, normalizedKey, value)
  const validated = ConfigSchema.parse(updated)
  await saveConfig(validated)
  return validated
}
