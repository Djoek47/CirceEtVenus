/** Serper query builders for leak discovery (handles + content titles). */

const LEAK_KWS = [
  'onlyfans leak',
  'onlyfans leaked',
  'fansly leak',
  'fansly leaked',
  'mega',
  'telegram',
  'reddit',
  'site:reddit.com',
  'download',
  'free onlyfans',
  'coomer',
  'kemono',
  'simpcity',
  'forums',
  'discord',
] as const

const TITLE_LEAK_KWS = ['leak', 'leaked', 'mega', 'telegram', 'reddit', 'download', 'coomer', 'free'] as const

/** Max characters per title segment in a quoted query (avoid huge strings). */
const MAX_TITLE_LEN = 72

export function sanitizeTitleForSearch(raw: string): string {
  const t = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE_LEN)
  if (t.length < 3) return ''
  return t
}

/** Handle-based queries (current + former usernames, aliases). */
export function buildQueries(usernames: string[]): string[] {
  const queries: string[] = []
  for (const u of usernames) {
    const clean = u.replace(/^@/, '').trim()
    if (!clean) continue
    for (const kw of LEAK_KWS) {
      queries.push(`"${clean}" ${kw}`)
      queries.push(`onlyfans ${clean} ${kw}`)
      queries.push(`fansly ${clean} ${kw}`)
    }
  }
  return Array.from(new Set(queries))
}

/**
 * Title-based queries: pairs sanitized content titles with leak keywords.
 * Optionally pairs first handle with title for disambiguation.
 */
export function buildTitleQueries(
  titles: string[],
  primaryHandle: string | undefined,
  maxQueries: number,
): string[] {
  const queries: string[] = []
  const handle = primaryHandle?.replace(/^@/, '').trim()

  for (const raw of titles) {
    const t = sanitizeTitleForSearch(raw)
    if (!t) continue
    for (const kw of TITLE_LEAK_KWS) {
      queries.push(`"${t}" ${kw}`)
    }
    if (handle) {
      queries.push(`"${t}" ${handle} leak`)
      queries.push(`"${t}" onlyfans leak`)
    }
  }

  return Array.from(new Set(queries)).slice(0, Math.max(0, maxQueries))
}
