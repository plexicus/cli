import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Box, Text, useInput } from 'ink'
import TextInput from 'ink-text-input'
import { useAppState } from '../state/AppState.js'
import { accent } from '../utils/theme.js'
import { PlexicusApi } from '../services/plexicusApi.js'
import { loadConfig } from '../services/config.js'
import { Spinner } from './design-system/Spinner.js'
import type { ScmProvider, ScmRepo } from '../types.js'

type FlowStep =
  | 'pick-provider'
  | 'authorizing'
  | 'gitea-form'
  | 'manual-url'
  | 'pick-repos'
  | 'importing'
  | 'done'
  | 'error'

const PROVIDERS: { id: ScmProvider; label: string; oauth: boolean; available: boolean }[] = [
  { id: 'github', label: 'GitHub', oauth: true, available: true },
  { id: 'gitlab', label: 'GitLab (coming soon)', oauth: true, available: false },
  { id: 'bitbucket', label: 'Bitbucket Cloud (coming soon)', oauth: true, available: false },
  { id: 'gitea', label: 'Gitea (coming soon)', oauth: false, available: false },
]

async function openBrowser(url: string): Promise<boolean> {
  try {
    const cmd = process.platform === 'darwin' ? 'open' : 'xdg-open'
    await Bun.$`${cmd} ${url}`.quiet()
    return true
  } catch {
    return false
  }
}

export function SCMConnectFlow({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useAppState()
  const ac = accent(state.theme)

  const [step, setStep] = useState<FlowStep>('pick-provider')
  const [cursor, setCursor] = useState(0)
  const [provider, setProvider] = useState<ScmProvider>('github')
  const [oauthUrl, setOauthUrl] = useState('')
  const [browserOpened, setBrowserOpened] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [repos, setRepos] = useState<ScmRepo[]>([])
  const [repoQuery, setRepoQuery] = useState('')
  const [selectedRepoIds, setSelectedRepoIds] = useState<Set<string>>(new Set())
  const [importedCount, setImportedCount] = useState(0)
  const [giteaUrl, setGiteaUrl] = useState('')
  const [giteaToken, setGiteaToken] = useState('')
  const [giteaField, setGiteaField] = useState<'url' | 'token'>('url')
  const [manualRepoUrl, setManualRepoUrl] = useState('')
  const [manualNickname, setManualNickname] = useState('')
  const [manualField, setManualField] = useState<'url' | 'nickname'>('url')

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPoll = useCallback(() => {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => () => stopPoll(), [])

  const startOAuth = useCallback(async (prov: 'github') => {
    try {
      const config = await loadConfig()
      const api = new PlexicusApi({ baseUrl: config.serverUrl, token: state.token ?? undefined })
      const url = await api.getOAuthUrl(prov)
      setOauthUrl(url)
      setStep('authorizing')
      const opened = await openBrowser(url)
      setBrowserOpened(opened)

      let attempts = 0
      pollRef.current = setInterval(async () => {
        attempts++
        if (attempts > 90) {
          stopPoll()
          setErrorMsg('Authorization timed out. Please try again.')
          setStep('error')
          return
        }
        try {
          const validity = await api.checkScmValidity()
          if (validity[prov]) {
            stopPoll()
            const scmRepos = await api.getScmRepos(prov)
            setRepos(scmRepos)
            setCursor(0)
            setStep('pick-repos')
          }
        } catch {
          // ignore -- keep polling
        }
      }, 2000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to start OAuth')
      setStep('error')
    }
  }, [state.token, stopPoll])

  const connectGitea = useCallback(async () => {
    try {
      const config = await loadConfig()
      const api = new PlexicusApi({ baseUrl: config.serverUrl, token: state.token ?? undefined })
      await api.saveGiteaConnector(giteaUrl, giteaToken)
      const valid = await api.testScmConnection('gitea')
      if (!valid) throw new Error('Connection test failed — check URL and token')
      const scmRepos = await api.getScmRepos('gitea')
      setRepos(scmRepos)
      setCursor(0)
      setStep('pick-repos')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gitea connection failed')
      setStep('error')
    }
  }, [giteaUrl, giteaToken, state.token])

  const connectManual = useCallback(async () => {
    const url = manualRepoUrl.trim()
    if (!url) return
    const nickname = manualNickname.trim() || url.split('/').filter(Boolean).pop() || url
    const guessProvider = (u: string): string => {
      if (u.includes('github.com')) return 'github'
      if (u.includes('gitlab.com')) return 'gitlab'
      if (u.includes('bitbucket.org')) return 'bitbucket'
      return 'gitea'
    }
    setStep('importing')
    try {
      const config = await loadConfig()
      const api = new PlexicusApi({ baseUrl: config.serverUrl, token: state.token ?? undefined })
      const repo = { id: nickname, name: nickname, full_name: nickname, html_url: url }
      await api.importRepositories([repo], guessProvider(url))
      setImportedCount(1)
      setStep('done')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Import failed')
      setStep('error')
    }
  }, [manualRepoUrl, manualNickname, state.token])

  const importSelected = useCallback(async () => {
    const toImport = repos.filter(r => selectedRepoIds.has(r.id))
    if (toImport.length === 0) return
    setStep('importing')
    try {
      const config = await loadConfig()
      const api = new PlexicusApi({ baseUrl: config.serverUrl, token: state.token ?? undefined })
      await api.importRepositories(toImport, provider)
      setImportedCount(toImport.length)
      setStep('done')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Import failed')
      setStep('error')
    }
  }, [repos, selectedRepoIds, state.token])

  const filteredRepos = repoQuery
    ? repos.filter(r => r.full_name.toLowerCase().includes(repoQuery.toLowerCase()))
    : repos
  const visibleRepos = filteredRepos.slice(0, 12)

  useInput((input, key) => {
    if (state.inputMode !== 'scm') return

    if (key.escape) {
      stopPoll()
      if (step === 'pick-provider') {
        dispatch({ type: 'scm/close' })
        onClose()
      } else {
        setStep('pick-provider')
        setOauthUrl('')
        setBrowserOpened(false)
        setRepos([])
        setSelectedRepoIds(new Set())
        setGiteaUrl('')
        setGiteaToken('')
        setGiteaField('url')
      }
      return
    }

    if (step === 'pick-provider') {
      if (input === 'm') { setStep('manual-url'); setManualRepoUrl(''); setManualNickname(''); setManualField('url'); return }
      if (input === 'j' || key.downArrow) { setCursor(c => Math.min(c + 1, PROVIDERS.length - 1)); return }
      if (input === 'k' || key.upArrow) { setCursor(c => Math.max(c - 1, 0)); return }
      if (key.return) {
        const prov = PROVIDERS[cursor]!
        if (!prov.available) return
        setProvider(prov.id)
        if (prov.id === 'github') {
          startOAuth('github')
        } else if (!prov.oauth) {
          setStep('gitea-form')
        }
        return
      }
    }

    if (step === 'pick-repos') {
      if (input === 'j' || key.downArrow) { setCursor(c => Math.min(c + 1, visibleRepos.length - 1)); return }
      if (input === 'k' || key.upArrow) { setCursor(c => Math.max(c - 1, 0)); return }
      if (input === ' ') {
        const repo = visibleRepos[cursor]
        if (repo) {
          setSelectedRepoIds(prev => {
            const next = new Set(prev)
            next.has(repo.id) ? next.delete(repo.id) : next.add(repo.id)
            return next
          })
        }
        return
      }
      if (key.return) {
        importSelected()
        return
      }
    }

    if (step === 'error') {
      if (input === 'm') { setStep('manual-url'); setManualRepoUrl(''); setManualNickname(''); setManualField('url'); return }
      if (key.return || key.escape) { dispatch({ type: 'scm/close' }); onClose() }
      return
    }

    if (step === 'done') {
      if (key.return || key.escape) { dispatch({ type: 'scm/close' }); onClose() }
      return
    }
  })

  const providerLabel = PROVIDERS.find(p => p.id === provider)?.label ?? provider

  return (
    <Box flexDirection="column" borderStyle="bold" borderColor={ac} paddingX={1} marginTop={1}>
      <Text bold color={ac}>Connect SCM</Text>

      {step === 'pick-provider' && (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>Select a provider to connect:</Text>
          {PROVIDERS.map((p, i) => (
            <Text key={p.id} inverse={i === cursor && p.available} dimColor={!p.available}>
              {i === cursor ? '▶ ' : '  '}{p.label}
            </Text>
          ))}
          <Box marginTop={1}><Text dimColor>↑↓=navigate  Enter=select  m=manual URL  Esc=cancel</Text></Box>
        </Box>
      )}

      {step === 'gitea-form' && (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>Enter your Gitea server details:</Text>
          <Box marginTop={1}>
            <Text dimColor>URL: </Text>
            <TextInput
              value={giteaUrl}
              onChange={setGiteaUrl}
              onSubmit={() => setGiteaField('token')}
              placeholder="https://gitea.example.com"
              focus={giteaField === 'url'}
            />
          </Box>
          <Box>
            <Text dimColor>Token: </Text>
            <TextInput
              value={giteaToken}
              onChange={setGiteaToken}
              onSubmit={connectGitea}
              placeholder="your-access-token"
              mask="•"
              focus={giteaField === 'token'}
            />
          </Box>
          <Box marginTop={1}><Text dimColor>Tab/Enter to move between fields  Enter on token to connect  Esc=back</Text></Box>
        </Box>
      )}

      {step === 'authorizing' && (
        <Box flexDirection="column" marginTop={1}>
          {browserOpened ? (
            <Box><Spinner interval={100} /><Text> Browser opened — complete authorization then return here</Text></Box>
          ) : (
            <Box flexDirection="column">
              <Text color="yellow">Could not open browser automatically.</Text>
              <Text>Visit this URL to authorize {providerLabel}:</Text>
              <Text color="cyan" wrap="wrap">{oauthUrl}</Text>
              <Text dimColor>Press Enter when authorization is complete</Text>
            </Box>
          )}
          <Box marginTop={1}><Spinner label="Waiting for authorization..." interval={120} /></Box>
          <Box marginTop={1}><Text dimColor>Esc=back</Text></Box>
        </Box>
      )}

      {step === 'pick-repos' && (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>Select repositories to import ({selectedRepoIds.size} selected):</Text>
          <Box>
            <Text dimColor>/ </Text>
            <TextInput value={repoQuery} onChange={(v) => { setRepoQuery(v); setCursor(0) }} placeholder="filter repos..." />
          </Box>
          {visibleRepos.map((repo, i) => {
            const selected = selectedRepoIds.has(repo.id)
            return (
              <Text key={repo.id} inverse={i === cursor}>
                {i === cursor ? '▶ ' : '  '}
                <Text color={selected ? 'green' : undefined}>{selected ? '✓ ' : '  '}</Text>
                {repo.full_name}
                {repo.private && <Text dimColor> (private)</Text>}
              </Text>
            )
          })}
          <Text dimColor>{visibleRepos.length}/{repos.length} repos</Text>
          <Box marginTop={1}><Text dimColor>↑↓=navigate  Space=toggle  Enter=import selected  Esc=back</Text></Box>
        </Box>
      )}

      {step === 'importing' && (
        <Box marginTop={1}>
          <Spinner label={`Importing ${selectedRepoIds.size} repositories...`} interval={120} />
        </Box>
      )}

      {step === 'done' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="green">✓ {importedCount} repositories imported successfully</Text>
          <Text dimColor>Press Enter or Esc to close</Text>
        </Box>
      )}

      {step === 'manual-url' && (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor>Enter the repository URL and a nickname:</Text>
          <Box marginTop={1}>
            <Text dimColor>URL: </Text>
            <TextInput
              value={manualRepoUrl}
              onChange={setManualRepoUrl}
              onSubmit={() => setManualField('nickname')}
              placeholder="https://github.com/org/repo"
              focus={manualField === 'url'}
            />
          </Box>
          <Box>
            <Text dimColor>Name: </Text>
            <TextInput
              value={manualNickname}
              onChange={setManualNickname}
              onSubmit={connectManual}
              placeholder="my-repo (optional)"
              focus={manualField === 'nickname'}
            />
          </Box>
          <Box marginTop={1}><Text dimColor>Enter to advance  Enter on name to import  Esc=back</Text></Box>
        </Box>
      )}

      {step === 'error' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="red">✗ {errorMsg}</Text>
          <Box marginTop={1}>
            <Text dimColor>m=add repo manually  Esc=close</Text>
          </Box>
        </Box>
      )}
    </Box>
  )
}
