import type { LocalCommand } from '../../commands.js'
import { setConfigValue } from '../../services/config.js'

const configCommand: LocalCommand = {
  name: 'config',
  type: 'local',
  description: 'Manage configuration (/config set <key> <value>)',
  call: async (args, _ctx) => {
    const [subcommand, key, ...valueParts] = args
    if (subcommand !== 'set' || !key || valueParts.length === 0) {
      return 'Usage: /config set <key> <value>'
    }
    const value = valueParts.join(' ')
    await setConfigValue(key, value)
    return `Config updated: ${key} = ${value}`
  },
}

export default configCommand
