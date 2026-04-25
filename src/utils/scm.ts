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
  const base = repo.uri.replace(/\/$/, '')
  const branch = repo.repository_branch || 'main'
  const line = finding.line ? `#L${finding.line}` : ''
  return `${base}/blob/${branch}/${finding.file_path}${line}`
}

export async function openScmLink(url: string): Promise<{ opened: boolean; url: string }> {
  try {
    const cmd = process.platform === 'darwin' ? 'open' : 'xdg-open'
    await Bun.$`${cmd} ${url}`.quiet()
    return { opened: true, url }
  } catch {
    try {
      const clipCmd = process.platform === 'darwin' ? 'pbcopy' : 'xclip'
      await Bun.$`echo ${url} | ${clipCmd}`.quiet()
    } catch {
      // clipboard copy also failed — URL will be shown in UI anyway
    }
    return { opened: false, url }
  }
}
