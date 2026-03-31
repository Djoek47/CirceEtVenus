/**
 * User-facing copy for failed API responses from `apiFetch` / Next.js routes.
 *
 * @param serverMessage — Prefer this when the API returns a `message` field (e.g. OnlyFans session expiry).
 */
export function formatApiScreenError(
  status: number,
  bodyError?: string | null,
  serverMessage?: string | null,
): string {
  const detail = serverMessage?.trim()
  if (detail) return detail

  if (status === 401) {
    if (bodyError && bodyError !== 'Unauthorized') {
      return bodyError
    }
    return 'Session expired or not signed in. Pull to refresh, or sign out and sign in again. Ensure EXPO_PUBLIC_API_URL matches your deployed site and uses the same Supabase project as this app.'
  }
  if (bodyError) return bodyError
  if (status === 0) return 'Network error — check connection and EXPO_PUBLIC_API_URL.'
  return `Request failed (${status})`
}
