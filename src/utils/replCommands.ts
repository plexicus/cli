export interface ReplCommand {
  name: string
  aliases?: string[]
  template: string
  description: string
}

export const REPL_COMMANDS: ReplCommand[] = [
  { name: 'filter', template: 'filter', description: 'Open filter modal' },
  { name: 'scan', template: 'scan', description: 'Request scan for selected repo' },
  { name: 'theme', template: 'theme <plexicus|dark|light>', description: 'Switch UI theme' },
  { name: 'config', template: 'config set <key> <value>', description: 'Set a config value' },
  { name: 'help', aliases: ['?'], template: 'help', description: 'Show keybindings help' },
]

export function matchCommand(input: string): ReplCommand | null {
  const normalized = input.startsWith('/') ? input.slice(1) : input
  if (!normalized.trim()) return null
  const cmd = normalized.split(/\s+/)[0]?.toLowerCase() ?? ''
  return (
    REPL_COMMANDS.find(c => c.name === cmd) ??
    REPL_COMMANDS.find(c => c.aliases?.includes(cmd)) ??
    REPL_COMMANDS.find(c => c.name.startsWith(cmd)) ??
    REPL_COMMANDS.find(c => c.aliases?.some(a => a.startsWith(cmd))) ??
    null
  )
}

export function filterCommands(input: string): ReplCommand[] {
  const normalized = (input.startsWith('/') ? input.slice(1) : input).toLowerCase().trim()
  if (!normalized) return REPL_COMMANDS
  return REPL_COMMANDS.filter(c =>
    c.name.startsWith(normalized) ||
    c.aliases?.some(a => a.startsWith(normalized))
  )
}
