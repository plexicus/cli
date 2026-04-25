import type { Repository, Finding } from '../types.js'

export function scmLabel(sourceControl: string): string {
  switch (sourceControl.toLowerCase()) {
    case 'github': return 'View on GitHub'
    case 'gitlab': return 'View on GitLab'
    case 'bitbucket': return 'View on Bitbucket'
    case 'gitea': return 'View on Gitea'
    default: return 'View Source'
  }
}

export function scmUrl(repo: Repository, finding: Finding): string | null {
  if (!finding.file_path) return null
  const base = (repo.html_url ?? repo.uri).replace(/\/$/, '')
  if (!base.startsWith('http')) return null
  const branch = repo.repository_branch || 'main'
  const line = finding.line ? `#L${finding.line}` : ''
  return `${base}/blob/${branch}/${finding.file_path}${line}`
}

export async function openScmLink(url: string): Promise<{ opened: boolean; copied: boolean; url: string }> {
  let opened = false
  let copied = false
  try {
    const cmd = process.platform === 'darwin' ? 'open' : 'xdg-open'
    await Bun.$`${cmd} ${url}`.quiet()
    opened = true
  } catch {
    try {
      const clipCmd = process.platform === 'darwin' ? 'pbcopy' : 'xclip'
      await Bun.$`echo ${url} | ${clipCmd}`.quiet()
      copied = true
    } catch {
      // show URL in UI as fallback
    }
  }
  return { opened, copied, url }
}
