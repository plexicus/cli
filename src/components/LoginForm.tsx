import React, { useState, useCallback } from 'react'
import { Box, Text } from 'ink'
import TextInput from 'ink-text-input'
import { useAppState } from '../state/AppState.js'
import { PlexicusApi } from '../services/plexicusApi.js'
import { loadConfig, saveConfig } from '../services/config.js'

type LoginStep = 'email' | 'password' | 'otp' | 'loading' | 'done'

interface LoginFormProps {
  prefilledToken?: string  // from --token flag
}

export function LoginForm({ prefilledToken }: LoginFormProps) {
  const { dispatch } = useAppState()
  const [step, setStep] = useState<LoginStep>(prefilledToken ? 'loading' : 'email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [partialToken, setPartialToken] = useState<string | null>(null)

  // Handle --token flag: validate and store immediately
  React.useEffect(() => {
    if (!prefilledToken) return
    async function storeToken() {
      try {
        const config = await loadConfig()
        const api = new PlexicusApi({ baseUrl: config.serverUrl, token: prefilledToken })
        const user = await api.getSession()
        await saveConfig({ ...config, token: prefilledToken! })
        dispatch({ type: 'auth/set', payload: { user, token: prefilledToken! } })
        setStep('done')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid token')
        setStep('email')
      }
    }
    storeToken()
  }, [prefilledToken])

  const handleEmailSubmit = useCallback((value: string) => {
    if (!value.trim()) return
    setEmail(value.trim())
    setStep('password')
    setError(null)
  }, [])

  const handlePasswordSubmit = useCallback(async (value: string) => {
    if (!value.trim()) return
    setPassword(value.trim())
    setStep('loading')
    setError(null)

    try {
      const config = await loadConfig()
      const api = new PlexicusApi({ baseUrl: config.serverUrl })
      const response = await api.login(email, value.trim())

      if (response.requires_2fa) {
        // Stay mounted — switch to OTP mode
        setPartialToken(response.access_token)
        setStep('otp')
        return
      }

      const sessionUser = await new PlexicusApi({ baseUrl: config.serverUrl, token: response.access_token }).getSession()
      await saveConfig({ ...config, token: response.access_token })
      dispatch({ type: 'auth/set', payload: { user: sessionUser, token: response.access_token } })
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      setStep('password')
    }
  }, [email, dispatch])

  const handleOtpSubmit = useCallback(async (value: string) => {
    if (!value.trim()) return
    setOtp(value.trim())
    setStep('loading')
    setError(null)

    try {
      const config = await loadConfig()
      const api = new PlexicusApi({ baseUrl: config.serverUrl, token: partialToken ?? undefined })
      const response = await api.verify2FA(value.trim())
      const sessionUser = await new PlexicusApi({ baseUrl: config.serverUrl, token: response.access_token }).getSession()
      await saveConfig({ ...config, token: response.access_token })
      dispatch({ type: 'auth/set', payload: { user: sessionUser, token: response.access_token } })
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : '2FA verification failed')
      setStep('otp')
    }
  }, [partialToken, dispatch])

  if (step === 'done') return null

  return (
    <Box flexDirection="column" padding={2}>
      <Text bold color="cyan">Plexicus Login</Text>
      <Box marginTop={1} />

      {step === 'loading' && (
        <Text color="yellow">Authenticating...</Text>
      )}

      {step === 'email' && (
        <Box flexDirection="column">
          <Text>Email: </Text>
          <TextInput
            value={email}
            onChange={setEmail}
            onSubmit={handleEmailSubmit}
            placeholder="you@example.com"
          />
        </Box>
      )}

      {step === 'password' && (
        <Box flexDirection="column">
          <Text dimColor>Email: {email}</Text>
          <Text>Password: </Text>
          <TextInput
            value={password}
            onChange={setPassword}
            onSubmit={handlePasswordSubmit}
            placeholder="••••••••"
            mask="•"
          />
        </Box>
      )}

      {step === 'otp' && (
        <Box flexDirection="column">
          <Text dimColor>Email: {email}</Text>
          <Text color="yellow">Two-factor authentication required</Text>
          <Text>OTP Code: </Text>
          <TextInput
            value={otp}
            onChange={setOtp}
            onSubmit={handleOtpSubmit}
            placeholder="123456"
          />
        </Box>
      )}

      {error && (
        <Box marginTop={1}>
          <Text color="red">Error: {error}</Text>
        </Box>
      )}

      {step === 'email' && (
        <Box marginTop={1}>
          <Text dimColor>Tip: use --token &lt;key&gt; or PLEXICUS_TOKEN=&lt;key&gt; to skip login</Text>
        </Box>
      )}
    </Box>
  )
}
