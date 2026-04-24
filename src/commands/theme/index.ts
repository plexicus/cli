import type { LocalCommand } from '../../commands.js'

const themeCommand: LocalCommand = {
  name: 'theme',
  type: 'local',
  description: 'Switch between dark and light theme (/theme <dark|light>)',
  call: async (args, ctx) => {
    const theme = args[0]
    if (theme !== 'dark' && theme !== 'light') return 'Usage: /theme <dark|light>'
    ctx.dispatch({ type: 'ui/setTheme', payload: theme })
    return `Theme set to ${theme}`
  },
}

export default themeCommand
