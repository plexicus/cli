import type { LocalCommand } from '../../commands.js'

const askCommand: LocalCommand = {
  name: 'ask',
  type: 'local',
  description: 'Ask the AI assistant a security question (/ask <question>)',
  aliases: ['a'],
  call: async (args, ctx) => {
    const { dispatch, state } = ctx
    if (args.length === 0) return 'Usage: /ask <question>'
    if (!state.chatVisible) dispatch({ type: 'chat/toggle' })
    dispatch({ type: 'ui/setInputMode', payload: 'chat' })
    dispatch({ type: 'chat/setPending', payload: args.join(' ') })
    return undefined
  },
}

export default askCommand
