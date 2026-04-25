import { describe, it, expect } from 'bun:test'
import { deriveWebUrl } from '../../src/utils/url.js'

describe('deriveWebUrl', () => {
  it('uses explicit webUrl when configured', () => {
    expect(deriveWebUrl({ serverUrl: 'https://api.app.plexicus.ai', webUrl: 'https://app.plexicus.ai' }))
      .toBe('https://app.plexicus.ai')
  })

  it('strips trailing slash from explicit webUrl', () => {
    expect(deriveWebUrl({ serverUrl: 'https://api.app.plexicus.ai', webUrl: 'https://app.plexicus.ai/' }))
      .toBe('https://app.plexicus.ai')
  })

  it('derives URL by stripping api. prefix', () => {
    expect(deriveWebUrl({ serverUrl: 'https://api.app.plexicus.ai' }))
      .toBe('https://app.plexicus.ai')
  })

  it('returns null for IP:port (no api. prefix, no webUrl)', () => {
    expect(deriveWebUrl({ serverUrl: 'http://192.168.1.10:8000' }))
      .toBeNull()
  })

  it('returns null for localhost URL without api. prefix', () => {
    expect(deriveWebUrl({ serverUrl: 'http://localhost:8000' }))
      .toBeNull()
  })

  it('handles https with api. prefix correctly', () => {
    expect(deriveWebUrl({ serverUrl: 'https://api.custom.example.com' }))
      .toBe('https://custom.example.com')
  })
})
