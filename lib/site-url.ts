const FALLBACK_PUBLIC_URL = 'https://www.circeetvenus.com'

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

/**
 * Canonical public origin used for metadata/sitemaps/OAuth/webhook docs.
 *
 * Precedence:
 * - APP_URL (server-only, preferred)
 * - NEXT_PUBLIC_APP_URL (shared runtime fallback)
 * - hardcoded canonical fallback
 */
export function getAppUrl(): string {
  const raw = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || FALLBACK_PUBLIC_URL
  return stripTrailingSlash(raw)
}

export function getCanonicalHost(): string {
  try {
    return new URL(getAppUrl()).host
  } catch {
    return new URL(FALLBACK_PUBLIC_URL).host
  }
}

export function getCanonicalUrl(path: string): string {
  const base = getAppUrl()
  if (!path || path === '/') return base
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}
