#!/usr/bin/env bun
import { program } from '@commander-js/extra-typings'
import React from 'react'
import { render } from 'ink'

const { version } = await import('../package.json', { with: { type: 'json' } })

program
  .name('plexicus')
  .description('Plexicus ASPM TUI — security posture at your fingertips')
  .version(version)
  .option('--repo <name>', 'filter findings to a specific repository')
  .option('--cve <id>', 'jump directly to a finding by CVE ID')
  .option('--token <token>', 'authenticate with a Bearer token')
  .action(async (options) => {
    const { loadConfig } = await import('./services/config.js')
    const config = await loadConfig()

    // Resolve token: --token flag > PLEXICUS_TOKEN env > config file
    const token = options.token ?? process.env.PLEXICUS_TOKEN ?? config.token

    const { default: App } = await import('./components/App.js')
    render(React.createElement(App, { ...options, config, token }))
  })

program
  .command('login')
  .description('Authenticate with the Plexicus API')
  .option('--token <token>', 'skip interactive login, store this token directly')
  .action(async (options) => {
    const { loadConfig } = await import('./services/config.js')
    const { AppStateProvider } = await import('./state/AppState.js')
    const { LoginForm } = await import('./components/LoginForm.js')
    const config = await loadConfig()
    const loginEl = React.createElement(LoginForm, { prefilledToken: options.token })
    render(
      React.createElement(AppStateProvider, { initialTheme: config.theme, children: loginEl }),
    )
  })

program
  .command('repos')
  .description('Browse and manage repositories')
  .action(async () => {
    const { loadConfig } = await import('./services/config.js')
    const { default: App } = await import('./components/App.js')
    const config = await loadConfig()
    const token = process.env.PLEXICUS_TOKEN ?? config.token
    render(React.createElement(App, { config, token, initialPanel: 'repos' }))
  })

program
  .command('config')
  .description('Manage plexicus configuration')
  .addCommand(
    program
      .createCommand('set')
      .argument('<key>', 'config key (e.g. llm.provider)')
      .argument('<value>', 'config value')
      .action(async (key, value) => {
        const { default: ConfigSetCommand } = await import('./commands/configSet.js')
        await ConfigSetCommand(key, value)
      }),
  )

program.parse()
