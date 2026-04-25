import { memoize } from 'lodash-es'
import type { ReactElement } from 'react'
import type { AppState } from './state/AppState.js'
import type { Action } from './state/actions.js'

export interface CommandCtx {
  state: AppState
  dispatch: React.Dispatch<Action>
}

interface CommandBase {
  name: string
  description: string
  aliases?: string[]
}

export interface PromptCommand extends CommandBase {
  type: 'prompt'
  getPrompt: (args: string[]) => string
}

export interface LocalCommand extends CommandBase {
  type: 'local'
  call: (args: string[], ctx: CommandCtx) => Promise<string | void>
}

export interface LocalJSXCommand extends CommandBase {
  type: 'local-jsx'
  render: (args: string[], ctx: CommandCtx) => ReactElement
}

export type Command = PromptCommand | LocalCommand | LocalJSXCommand

// Memoized command registry — lazy loads modules
const loadCommands = memoize(async (): Promise<Command[]> => {
  const [themeMod, filterMod, configMod] = await Promise.all([
    import('./commands/theme/index.js'),
    import('./commands/filter/index.js'),
    import('./commands/config/index.js'),
  ])
  return [
    themeMod.default,
    filterMod.default,
    configMod.default,
  ]
})

export async function findCommand(name: string): Promise<Command | undefined> {
  const commands = await loadCommands()
  return commands.find(c => c.name === name || c.aliases?.includes(name))
}

export async function getAllCommands(): Promise<Command[]> {
  return loadCommands()
}
