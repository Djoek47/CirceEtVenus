export function normalizeUrl(raw: string): string | null {
  try {
    const u = new URL(raw)
    // Drop fragments and common tracking params
    u.hash = ''
    const trackingParams = new Set([
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'gclid',
      'fbclid',
      'mc_cid',
      'mc_eid',
      'ref',
      'ref_src',
    ])
    for (const key of Array.from(u.searchParams.keys())) {
      if (trackingParams.has(key)) u.searchParams.delete(key)
    }
    // Normalize hostname + remove default ports
    u.hostname = u.hostname.toLowerCase()
    if ((u.protocol === 'https:' && u.port === '443') || (u.protocol === 'http:' && u.port === '80')) {
      u.port = ''
    }
    // Normalize trailing slash (keep root '/')
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1)
    }
    return u.toString()
  } catch {
    return null
  }
}

export function guessSourcePlatform(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase()
    if (host.includes('reddit.')) return 'reddit'
    if (host.includes('telegram.')) return 'telegram'
    if (host.includes('discord.')) return 'discord'
    if (host.includes('twitter.') || host === 'x.com' || host.includes('x.com')) return 'x'
    if (host.includes('tiktok.')) return 'tiktok'
    if (host.includes('instagram.')) return 'instagram'
    if (host.includes('coomer.')) return 'coomer'
    if (host.includes('kemono.')) return 'kemono'
    return host
  } catch {
    return 'unknown'
  }
}

