import type { LocalCommand } from '../../commands.js'

const themeCommand: LocalCommand = {
  name: 'theme',
  type: 'local',
  description: 'Switch theme (/theme <dark|light|plexicus>)',
  call: async (args, ctx) => {
    const theme = args[0]
    if (theme !== 'dark' && theme !== 'light' && theme !== 'plexicus') {
      return 'Usage: /theme <dark|light|plexicus>'
    }
    ctx.dispatch({ type: 'ui/setTheme', payload: theme })
    return `Theme set to ${theme}`
  },
}

export default themeCommand
