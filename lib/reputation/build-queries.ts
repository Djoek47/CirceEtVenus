/**
 * Serper query builders for reputation scans: wide web vs social-heavy discovery.
 */

const DEFAULT_WIDE_MAX = 30
const DEFAULT_SOCIAL_MAX = 30

export type ScanChannel = 'web_wide' | 'social'

export function getReputationWideMaxQueries(): number {
  const n = parseInt(process.env.REPUTATION_WIDE_MAX_QUERIES || '', 10)
  return Number.isFinite(n) && n > 0 ? Math.min(n, 80) : DEFAULT_WIDE_MAX
}

export function getReputationSocialMaxQueries(): number {
  const n = parseInt(process.env.REPUTATION_SOCIAL_MAX_QUERIES || '', 10)
  return Number.isFinite(n) && n > 0 ? Math.min(n, 80) : DEFAULT_SOCIAL_MAX
}

const WIDE_TERMS = [
  'interview',
  'article',
  'review',
  'magazine',
  'news',
  'podcast',
  'profile',
  'feature story',
  'press',
]

const SOCIAL_TERMS = [
  'drama',
  'thread',
  'gossip',
  'rumor',
  'controversy',
  'reddit thread',
  'viral',
  'callout',
]

function cleanHandle(name: string): string | null {
  const clean = name.replace(/^@/, '').trim()
  return clean || null
}

/**
 * News, magazines, general web — not siloed to social hosts.
 */
export function buildWideWebQueries(usernames: string[]): string[] {
  const queries: string[] = []
  for (const name of usernames) {
    const clean = cleanHandle(name)
    if (!clean) continue

    queries.push(`"${clean}" creator interview`)
    queries.push(`"${clean}" news`)
    queries.push(`"${clean}" review`)
    queries.push(`"${clean}" magazine OR article`)
    queries.push(`"${clean}" site:medium.com`)
    queries.push(`"${clean}" site:substack.com`)
    queries.push(`"${clean}" podcast OR "press release"`)
    queries.push(`"${clean}" onlyfans OR fansly review OR subscriber`)
    for (const kw of WIDE_TERMS) {
      queries.push(`"${clean}" ${kw}`)
    }
    queries.push(`"${clean}" -site:twitter.com -site:x.com -site:instagram.com -site:tiktok.com`)
  }
  return Array.from(new Set(queries)).slice(0, getReputationWideMaxQueries())
}

/**
 * X, IG, TikTok, Reddit + gossip / thread discovery.
 */
export function buildSocialQueries(usernames: string[]): string[] {
  const queries: string[] = []
  for (const name of usernames) {
    const clean = cleanHandle(name)
    if (!clean) continue

    queries.push(`"${clean}" site:twitter.com`)
    queries.push(`"${clean}" site:x.com`)
    queries.push(`"${clean}" site:instagram.com`)
    queries.push(`"${clean}" site:tiktok.com`)
    queries.push(`"${clean}" site:reddit.com`)
    for (const kw of SOCIAL_TERMS) {
      queries.push(`"${clean}" ${kw}`)
    }
    queries.push(`"${clean}" onlyfans scam OR drama`)
    queries.push(`"${clean}" fansly worth it OR subscribed`)
  }
  return Array.from(new Set(queries)).slice(0, getReputationSocialMaxQueries())
}
