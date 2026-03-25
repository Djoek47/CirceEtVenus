/**
 * Human-readable platform labels for indexed discovery (URL host / stored platform).
 */

export function formatMentionPlatform(platform: string): string {
  const p = (platform || '').toLowerCase().trim()
  if (!p || p === 'unknown') return 'Web'
  if (p === 'x' || p === 'twitter') return 'X'
  if (p === 'instagram') return 'Instagram'
  if (p === 'tiktok') return 'TikTok'
  if (p === 'reddit') return 'Reddit'
  if (p === 'telegram') return 'Telegram'
  if (p === 'discord') return 'Discord'
  if (p.includes('.')) {
    const host = p.replace(/^www\./, '')
    if (host.includes('twitter.') || host === 'x.com') return 'X'
    if (host.includes('instagram.')) return 'Instagram'
    if (host.includes('tiktok.')) return 'TikTok'
    return host.split('.')[0].slice(0, 24) || 'Web'
  }
  return p.charAt(0).toUpperCase() + p.slice(1)
}
