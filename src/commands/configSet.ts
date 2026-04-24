import { setConfigValue } from '../services/config.js'

export default async function ConfigSetCommand(key: string, value: string): Promise<void> {
  try {
    const updated = await setConfigValue(key, value)
    const isSensitive = key.includes('api_key') || key.includes('apiKey') || key === 'token'
    console.log(`✓ Set ${key} = ${isSensitive ? '***' : value}`)
    if (key.startsWith('llm.')) {
      console.log(`  provider: ${updated.llm.provider ?? '(not set)'}`)
      console.log(`  model:    ${updated.llm.model ?? '(default)'}`)
      console.log(`  api_key:  ${updated.llm.apiKey ? '***' : '(not set)'}`)
    }
  } catch (err) {
    console.error(`✗ Failed to set ${key}: ${err instanceof Error ? err.message : String(err)}`)
    process.exit(1)
  }
}
