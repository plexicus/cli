import { homedir } from 'os'
import { join } from 'path'

export function getConfigDir(): string {
  return join(homedir(), '.config', 'plexicus')
}

export function getConfigPath(): string {
  return join(getConfigDir(), 'config.json')
}
